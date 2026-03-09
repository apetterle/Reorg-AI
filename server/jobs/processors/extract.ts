import { storage } from "../../storage";
import { logger } from "../../logger";
import { redactText } from "../../pii";
import { getStorage } from "../../storage-adapter";
import { parseCsvPreview } from "../../parsers/csv";
import { parseXlsxPreview } from "../../parsers/xlsx";
import { detectKind, extractDocxText, extractPptxSlideText } from "../../parsers/preview";
import { step } from "../worker";
import type { Job } from "@shared/schema";

function csvAnchor(row: number, col: number): string {
  return `csv:r=${row}&c=${col}`;
}

function xlsxAnchor(sheet: string, row: number, col: number): string {
  return `xlsx:sheet=${encodeURIComponent(sheet)}!r=${row}&c=${col}`;
}

function textAnchor(offset: number, length?: number): string {
  return length ? `text:offset=${offset}&len=${length}` : `text:offset=${offset}`;
}

export async function processExtract(job: Job): Promise<void> {
  const { projectId, tenantId } = job;

  const result = await step(job.id, "extract_facts", async () => {
    const docs = await storage.getDocumentsForProject(projectId);
    const ingestedDocs = docs.filter((d) => d.status === "ingested" || d.status === "ready");
    const objectStorage = getStorage();

    let factsCreated = 0;

    for (let i = 0; i < ingestedDocs.length; i++) {
      const doc = ingestedDocs[i];

      if (doc.containsPii && !doc.sanitizedAt) {
        logger.warn("Skipping PII-blocked document", { source: "jobs", jobId: job.id, docId: doc.id });
        continue;
      }

      const exists = await objectStorage.exists({ key: doc.storageKey });
      if (!exists) continue;

      const buf = await objectStorage.getObject({ key: doc.storageKey });
      const kind = detectKind(doc.filename, doc.mimeType);

      if (kind === "csv") {
        factsCreated += await extractCsvFacts(buf, doc, projectId, tenantId, job.id);
      } else if (kind === "xlsx") {
        factsCreated += await extractXlsxFacts(buf, doc, projectId, tenantId, job.id);
      } else if (kind === "docx") {
        factsCreated += await extractDocxFacts(buf, doc, projectId, tenantId, job.id);
      } else if (kind === "pptx") {
        factsCreated += await extractPptxFacts(buf, doc, projectId, tenantId, job.id);
      } else if (kind === "text" || kind === "data") {
        factsCreated += await extractTextFacts(buf, doc, projectId, tenantId, job.id);
      }

      await storage.updateDocument(doc.id, { status: "extracted" });

      const progress = (((i + 1) / ingestedDocs.length) * 100).toFixed(2);
      await storage.updateJob(job.id, { progress });
    }

    return { factsCreated };
  });

  await storage.updateJob(job.id, { resultJson: result });
  logger.info("Extract job completed", { source: "jobs", jobId: job.id, projectId, tenantId, ...result });
  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, result, projectId);
}

async function extractCsvFacts(
  buf: Buffer, doc: any, projectId: string, tenantId: string, jobId: string
): Promise<number> {
  const preview = parseCsvPreview(buf);
  let created = 0;
  const bundleVersion = doc.bundleVersion || 0;

  for (let colIdx = 0; colIdx < preview.headers.length; colIdx++) {
    const header = preview.headers[colIdx];
    if (!header || header.trim().length === 0) continue;

    const sampleValues = preview.rows.slice(0, 5).map((r) => r[colIdx]).filter(Boolean);
    const numericValues = sampleValues.filter((v) => !isNaN(parseFloat(v)));

    if (numericValues.length > 0) {
      const fact = await storage.createFact({
        projectId,
        tenantId,
        factType: "kpi",
        key: `csv.${header.toLowerCase().replace(/\s+/g, "_")}`,
        valueJson: { value: parseFloat(numericValues[0]), sample: numericValues.slice(0, 3).map(Number), header },
        unit: null,
        confidence: 0.6,
        status: "proposed",
        derivedFromJobId: jobId,
      });

      await storage.createEvidence({
        factId: fact.id,
        tenantId,
        projectId,
        documentId: doc.id,
        kind: "csv_cell",
        refJson: {
          anchor: csvAnchor(1, colIdx + 1),
          header,
          bundle_version: bundleVersion,
        },
        snippetRedacted: true,
      });

      created++;
    }
  }

  return created;
}

async function extractXlsxFacts(
  buf: Buffer, doc: any, projectId: string, tenantId: string, jobId: string
): Promise<number> {
  const preview = parseXlsxPreview(buf);
  let created = 0;
  const bundleVersion = doc.bundleVersion || 0;

  for (const table of preview.previewTables.slice(0, 3)) {
    for (let colIdx = 0; colIdx < table.headers.length; colIdx++) {
      const header = table.headers[colIdx];
      if (!header || header.trim().length === 0) continue;

      const sampleValues = table.rows.slice(0, 5).map((r) => r[colIdx]).filter(Boolean);
      const numericValues = sampleValues.filter((v) => !isNaN(parseFloat(v)));

      if (numericValues.length > 0) {
        const fact = await storage.createFact({
          projectId,
          tenantId,
          factType: "kpi",
          key: `xlsx.${table.name.toLowerCase().replace(/\s+/g, "_")}.${header.toLowerCase().replace(/\s+/g, "_")}`,
          valueJson: { value: parseFloat(numericValues[0]), sample: numericValues.slice(0, 3).map(Number), header, sheet: table.name },
          unit: null,
          confidence: 0.7,
          status: "proposed",
          derivedFromJobId: jobId,
        });

        await storage.createEvidence({
          factId: fact.id,
          tenantId,
          projectId,
          documentId: doc.id,
          kind: "xlsx_cell",
          refJson: {
            anchor: xlsxAnchor(table.name, 1, colIdx + 1),
            header,
            sheet: table.name,
            bundle_version: bundleVersion,
          },
          snippetRedacted: true,
        });

        created++;
      }
    }
  }

  return created;
}

async function extractTextFacts(
  buf: Buffer, doc: any, projectId: string, tenantId: string, jobId: string
): Promise<number> {
  const content = buf.toString("utf-8").substring(0, 10000);
  const redacted = redactText(content);
  let created = 0;
  const bundleVersion = doc.bundleVersion || 0;

  const numberPattern = /(?:[\$R€£]?\s*\d{1,3}(?:[,.]?\d{3})*(?:[,.]\d{1,2})?)\s*(?:million|billion|mil|bi|MM|M|K|%|USD|BRL|EUR)?/gi;
  const matches = redacted.match(numberPattern);

  if (matches) {
    const seen = new Set<string>();
    for (let idx = 0; idx < Math.min(matches.length, 10); idx++) {
      const cleanMatch = matches[idx].trim();
      if (seen.has(cleanMatch) || cleanMatch.length < 2) continue;
      seen.add(cleanMatch);

      let unit = "";
      if (cleanMatch.includes("%")) unit = "percent";
      else if (/USD|\$/.test(cleanMatch)) unit = "USD";
      else if (/BRL|R\$/.test(cleanMatch)) unit = "BRL";
      else if (/EUR|€/.test(cleanMatch)) unit = "EUR";
      else if (/million|MM|mil/i.test(cleanMatch)) unit = "millions";

      const matchOffset = redacted.indexOf(cleanMatch);

      const fact = await storage.createFact({
        projectId,
        tenantId,
        factType: "numeric",
        key: `${doc.filename}_value_${idx + 1}`,
        valueJson: { raw: cleanMatch, source: doc.filename },
        unit: unit || null,
        confidence: 0.6,
        status: "proposed",
        derivedFromJobId: jobId,
      });

      await storage.createEvidence({
        factId: fact.id,
        tenantId,
        projectId,
        documentId: doc.id,
        kind: "text_excerpt",
        refJson: {
          anchor: textAnchor(matchOffset >= 0 ? matchOffset : 0, cleanMatch.length),
          excerpt: redacted.substring(Math.max(0, matchOffset - 50), matchOffset + cleanMatch.length + 50),
          bundle_version: bundleVersion,
        },
        snippetRedacted: true,
      });

      created++;
    }
  }

  const lines = redacted.split("\n").filter((l) => l.trim().length > 20);
  for (let idx = 0; idx < Math.min(lines.length, 3); idx++) {
    const lineOffset = redacted.indexOf(lines[idx]);

    const fact = await storage.createFact({
      projectId,
      tenantId,
      factType: "textual",
      key: `${doc.filename}_text_${idx + 1}`,
      valueJson: { text: lines[idx].trim().substring(0, 200), source: doc.filename },
      unit: null,
      confidence: 0.5,
      status: "proposed",
      derivedFromJobId: jobId,
    });

    await storage.createEvidence({
      factId: fact.id,
      tenantId,
      projectId,
      documentId: doc.id,
      kind: "text_excerpt",
      refJson: {
        anchor: textAnchor(lineOffset >= 0 ? lineOffset : 0, lines[idx].length),
        line: idx + 1,
        bundle_version: bundleVersion,
      },
      snippetRedacted: true,
    });

    created++;
  }

  return created;
}

function docxAnchor(offset: number, length?: number): string {
  return length ? `docx:offset=${offset}&len=${length}` : `docx:offset=${offset}`;
}

function pptxAnchor(slide: number, offset: number): string {
  return `pptx:slide=${slide}&offset=${offset}`;
}

async function extractDocxFacts(
  buf: Buffer, doc: any, projectId: string, tenantId: string, jobId: string
): Promise<number> {
  const text = await extractDocxText(buf);
  if (!text || text.trim().length === 0) return 0;
  const content = text.substring(0, 50000);
  const redacted = redactText(content);
  return extractFromText(redacted, doc, projectId, tenantId, jobId, "docx", docxAnchor);
}

async function extractPptxFacts(
  buf: Buffer, doc: any, projectId: string, tenantId: string, jobId: string
): Promise<number> {
  const text = extractPptxSlideText(buf);
  if (!text || text.trim().length === 0) return 0;
  const content = text.substring(0, 50000);
  const redacted = redactText(content);
  return extractFromText(redacted, doc, projectId, tenantId, jobId, "pptx", (offset, len) => {
    const slideMatch = redacted.substring(0, offset).match(/--- Slide (\d+) ---/g);
    const slideNum = slideMatch ? slideMatch.length : 1;
    return pptxAnchor(slideNum, offset);
  });
}

async function extractFromText(
  redacted: string, doc: any, projectId: string, tenantId: string, jobId: string,
  prefix: string, makeAnchor: (offset: number, length?: number) => string
): Promise<number> {
  let created = 0;
  const bundleVersion = doc.bundleVersion || 0;

  const numberPattern = /(?:[\$R\u20AC\u00A3]?\s*\d{1,3}(?:[,.]?\d{3})*(?:[,.]\d{1,2})?)\s*(?:million|billion|mil|bi|MM|M|K|%|USD|BRL|EUR)?/gi;
  const matches = redacted.match(numberPattern);

  if (matches) {
    const seen = new Set<string>();
    for (let idx = 0; idx < Math.min(matches.length, 15); idx++) {
      const cleanMatch = matches[idx].trim();
      if (seen.has(cleanMatch) || cleanMatch.length < 2) continue;
      seen.add(cleanMatch);

      let unit = "";
      if (cleanMatch.includes("%")) unit = "percent";
      else if (/USD|\$/.test(cleanMatch)) unit = "USD";
      else if (/BRL|R\$/.test(cleanMatch)) unit = "BRL";
      else if (/EUR|\u20AC/.test(cleanMatch)) unit = "EUR";
      else if (/million|MM|mil/i.test(cleanMatch)) unit = "millions";

      const matchOffset = redacted.indexOf(cleanMatch);

      const fact = await storage.createFact({
        projectId, tenantId, factType: "numeric",
        key: `${prefix}.${doc.filename}_value_${idx + 1}`,
        valueJson: { raw: cleanMatch, source: doc.filename },
        unit: unit || null, confidence: 0.6, status: "proposed", derivedFromJobId: jobId,
      });

      await storage.createEvidence({
        factId: fact.id, tenantId, projectId, documentId: doc.id,
        kind: `${prefix}_excerpt`,
        refJson: {
          anchor: makeAnchor(matchOffset >= 0 ? matchOffset : 0, cleanMatch.length),
          excerpt: redacted.substring(Math.max(0, matchOffset - 50), matchOffset + cleanMatch.length + 50),
          bundle_version: bundleVersion,
        },
        snippetRedacted: true,
      });
      created++;
    }
  }

  const lines = redacted.split("\n").filter((l) => l.trim().length > 20);
  for (let idx = 0; idx < Math.min(lines.length, 5); idx++) {
    const lineOffset = redacted.indexOf(lines[idx]);

    const fact = await storage.createFact({
      projectId, tenantId, factType: "textual",
      key: `${prefix}.${doc.filename}_text_${idx + 1}`,
      valueJson: { text: lines[idx].trim().substring(0, 200), source: doc.filename },
      unit: null, confidence: 0.5, status: "proposed", derivedFromJobId: jobId,
    });

    await storage.createEvidence({
      factId: fact.id, tenantId, projectId, documentId: doc.id,
      kind: `${prefix}_excerpt`,
      refJson: {
        anchor: makeAnchor(lineOffset >= 0 ? lineOffset : 0, lines[idx].length),
        line: idx + 1,
        bundle_version: bundleVersion,
      },
      snippetRedacted: true,
    });
    created++;
  }

  return created;
}
