import { storage } from "../../storage";
import { logger } from "../../logger";
import { step } from "../worker";
import { getStorage } from "../../storage-adapter";
import { detectKind, buildPreview, extractDocxText, extractPptxSlideText } from "../../parsers/preview";
import { parseCsvPreview } from "../../parsers/csv";
import { parseXlsxPreview } from "../../parsers/xlsx";
import { scanTextForPii, redactText } from "../../pii";
import type { Job } from "@shared/schema";

interface ChunkEntry {
  chunk_id: string;
  type: "text" | "table";
  text?: string;
  table_id?: string;
  anchors: string[];
  page_range: number[];
  tokens_estimate: number;
}

interface TableEntry {
  table_id: string;
  name: string;
  headers: string[];
  rows: string[][];
  schema_hints: Record<string, string>;
  anchors: string[];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, targetMin = 300, targetMax = 800): ChunkEntry[] {
  const chunks: ChunkEntry[] = [];
  const lines = text.split("\n");
  let currentChunk = "";
  let chunkIdx = 0;

  for (const line of lines) {
    if (estimateTokens(currentChunk + line) > targetMax && currentChunk.length > 0) {
      chunks.push({
        chunk_id: `c${String(chunkIdx).padStart(4, "0")}`,
        type: "text",
        text: currentChunk.trim(),
        anchors: [`text:offset=${currentChunk.length}`],
        page_range: [1, 1],
        tokens_estimate: estimateTokens(currentChunk),
      });
      chunkIdx++;
      currentChunk = "";
    }
    currentChunk += line + "\n";
  }

  if (currentChunk.trim()) {
    chunks.push({
      chunk_id: `c${String(chunkIdx).padStart(4, "0")}`,
      type: "text",
      text: currentChunk.trim(),
      anchors: [`text:offset=${currentChunk.length}`],
      page_range: [1, 1],
      tokens_estimate: estimateTokens(currentChunk),
    });
  }

  return chunks;
}

function guessSchemaHint(header: string, sample?: string): string {
  const h = header.toLowerCase();
  if (h.includes("date") || h.includes("month") || h.includes("period") || h.includes("ano") || h.includes("mês")) return "date";
  if (h.includes("percent") || h.includes("%") || h.includes("taxa") || h.includes("rate")) return "percent";
  if (h.includes("price") || h.includes("cost") || h.includes("valor") || h.includes("revenue") || h.includes("r$") || h.includes("receita")) return "currency";
  if (sample && !isNaN(Number(sample.replace(/[,\.]/g, "")))) return "number";
  return "string";
}

export async function processNormalize(job: Job): Promise<void> {
  const { projectId, tenantId } = job;
  const objStorage = getStorage();

  const docInfo = await step(job.id, "resolve_document", async () => {
    const inputJson = job.inputJson as any;
    const docId = inputJson?.documentId;
    if (!docId) {
      const docs = await storage.getDocumentsForProject(projectId);
      const target = docs.find((d) => d.status === "uploaded" || d.status === "ready" || d.status === "ingested");
      if (!target) throw new Error("No documents found to normalize");
      return { documentId: target.id, filename: target.filename, storageKey: target.storageKey, kind: target.kind, mimeType: target.mimeType };
    }
    const doc = await storage.getDocument(docId);
    if (!doc) throw new Error(`Document ${docId} not found`);
    return { documentId: doc.id, filename: doc.filename, storageKey: doc.storageKey, kind: doc.kind, mimeType: doc.mimeType };
  });

  const fileBuffer = await step(job.id, "fetch_file", async () => {
    const buf = await objStorage.getObject({ key: docInfo.storageKey });
    return { sizeBytes: buf.length };
  });

  const kind = detectKind(docInfo.filename, docInfo.mimeType || undefined);
  const doc = await storage.getDocument(docInfo.documentId);
  const bundleVersion = (doc?.bundleVersion || 0) + 1;
  const bundlePrefix = `bundles/${tenantId}/${projectId}/${docInfo.documentId}/v${bundleVersion}`;

  const extractResult = await step(job.id, "extract_content", async () => {
    const buf = await objStorage.getObject({ key: docInfo.storageKey });
    const tables: TableEntry[] = [];
    let textContent = "";
    let hasText = false;
    let hasTables = false;
    let tableCount = 0;

    if (kind === "csv") {
      const preview = parseCsvPreview(buf, 1000);
      hasText = true;
      hasTables = true;
      tableCount = 1;
      const tableId = "table_001";
      tables.push({
        table_id: tableId,
        name: docInfo.filename.replace(/\.[^.]+$/, ""),
        headers: preview.header,
        rows: preview.rows.map((r) => r.map(String)),
        schema_hints: Object.fromEntries(preview.header.map((h, i) => [h, guessSchemaHint(h, preview.rows[0]?.[i])])),
        anchors: [`csv:r=1..${preview.rows.length}&c=1..${preview.header.length}`],
      });
      textContent = `# ${docInfo.filename}\n\n| ${preview.header.join(" | ")} |\n| ${preview.header.map(() => "---").join(" | ")} |\n`;
      for (const row of preview.rows.slice(0, 50)) {
        textContent += `| ${row.join(" | ")} |\n`;
      }
    } else if (kind === "xlsx") {
      const preview = parseXlsxPreview(buf, 500);
      hasText = true;
      hasTables = true;
      tableCount = preview.previewTables.length;
      for (let i = 0; i < preview.previewTables.length; i++) {
        const sheet = preview.previewTables[i];
        const tableId = `table_${String(i + 1).padStart(3, "0")}`;
        tables.push({
          table_id: tableId,
          name: sheet.name,
          headers: sheet.headers,
          rows: sheet.rows.map((r: any[]) => r.map(String)),
          schema_hints: Object.fromEntries(sheet.headers.map((h: string, ci: number) => [h, guessSchemaHint(h, sheet.rows[0]?.[ci])])),
          anchors: [`xlsx:sheet=${sheet.name}!r=1..${sheet.rows.length}&c=1..${sheet.headers.length}`],
        });
        textContent += `# Sheet: ${sheet.name}\n\n| ${sheet.headers.join(" | ")} |\n| ${sheet.headers.map(() => "---").join(" | ")} |\n`;
        for (const row of sheet.rows.slice(0, 50)) {
          textContent += `| ${row.join(" | ")} |\n`;
        }
        textContent += "\n";
      }
    } else if (kind === "docx") {
      const docxText = await extractDocxText(buf);
      textContent = docxText.substring(0, 100000);
      hasText = textContent.length > 0;
    } else if (kind === "pptx") {
      const pptxText = extractPptxSlideText(buf);
      textContent = pptxText.substring(0, 100000);
      hasText = textContent.length > 0;
    } else {
      const rawBuf = buf;
      textContent = rawBuf.toString("utf-8").substring(0, 100000);
      hasText = textContent.length > 0;
    }

    return { hasText, hasTables, tableCount, textLength: textContent.length, tables, textContent };
  });

  const piiResult = await step(job.id, "pii_scan", async () => {
    const scan = scanTextForPii(extractResult.textContent);
    return { risk: scan.risk, findings: scan.findings };
  });

  await step(job.id, "write_manifest", async () => {
    const manifest = {
      bundle_version: bundleVersion,
      document_id: docInfo.documentId,
      source: {
        filename: docInfo.filename,
        mime: docInfo.mimeType || "application/octet-stream",
        sha256: doc?.sha256 || "",
      },
      created_at: new Date().toISOString(),
      sanitized: !!doc?.sanitizedAt,
      pii: {
        risk: piiResult.risk,
        findings_summary: piiResult.findings,
      },
      extract: {
        has_text: extractResult.hasText,
        has_tables: extractResult.hasTables,
        pages: 1,
        tables: extractResult.tableCount,
      },
      anchors: {
        scheme: "reorg-anchor-v1",
        examples: kind === "csv" ? ["csv:r=1&c=1"] : kind === "xlsx" ? ["xlsx:sheet=Sheet1!r=1&c=1"] : ["text:offset=0"],
      },
    };
    await objStorage.putObject({
      key: `${bundlePrefix}/manifest.json`,
      body: Buffer.from(JSON.stringify(manifest, null, 2)),
      contentType: "application/json",
    });
    return manifest;
  });

  await step(job.id, "write_text", async () => {
    const redacted = redactText(extractResult.textContent);
    await objStorage.putObject({
      key: `${bundlePrefix}/text.md`,
      body: Buffer.from(redacted),
      contentType: "text/markdown",
    });
    return { sizeBytes: redacted.length };
  });

  await step(job.id, "write_chunks", async () => {
    const chunks = chunkText(extractResult.textContent);
    const lines = chunks.map((c) => JSON.stringify(c)).join("\n");
    await objStorage.putObject({
      key: `${bundlePrefix}/chunks.jsonl`,
      body: Buffer.from(lines),
      contentType: "application/jsonl",
    });
    return { chunkCount: chunks.length };
  });

  await step(job.id, "write_tables", async () => {
    for (const table of extractResult.tables) {
      await objStorage.putObject({
        key: `${bundlePrefix}/tables/${table.table_id}.json`,
        body: Buffer.from(JSON.stringify(table, null, 2)),
        contentType: "application/json",
      });
    }
    return { tableCount: extractResult.tables.length };
  });

  await step(job.id, "update_document", async () => {
    await storage.updateDocument(docInfo.documentId, {
      bundleVersion,
      bundleStoragePrefix: bundlePrefix,
    });
    return { bundleVersion, bundlePrefix };
  });

  logger.info("Normalize completed", {
    source: "jobs",
    jobId: job.id,
    documentId: docInfo.documentId,
    bundleVersion,
    bundlePrefix,
    tables: extractResult.tableCount,
  });
}
