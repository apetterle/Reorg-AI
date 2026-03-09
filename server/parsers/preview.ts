import { parseCsvPreview, type CsvPreview } from "./csv";
import { parseXlsxPreview, type XlsxPreview, type XlsxSheetPreview } from "./xlsx";
import { scanTextForPii, type PiiScanResult } from "../pii";
import mammoth from "mammoth";

export type DocKind = "xlsx" | "csv" | "docx" | "pptx" | "pdf" | "text" | "data" | "other";

export interface PreviewResult {
  kind: DocKind;
  previewText?: string;
  previewTables?: {
    name: string;
    headers: string[];
    rows: string[][];
    totalRows: number;
  }[];
  warnings: string[];
  pii: {
    hasPii: boolean;
    risk: string;
    headerPii?: { header: string; hint: string }[];
    textFindings?: { type: string; count: number }[];
  };
}

export function detectKind(filename: string, mime?: string | null): DocKind {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (ext === "pptx" || mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["txt", "md", "log", "ini", "cfg", "conf"].includes(ext)) return "text";
  if (["json", "xml", "yaml", "yml"].includes(ext)) return "data";
  return "other";
}

export async function buildPreview(opts: { filename: string; mime?: string | null; buf: Buffer }): Promise<PreviewResult> {
  const kind = detectKind(opts.filename, opts.mime);
  const warnings: string[] = [];

  if (kind === "csv") {
    const preview = parseCsvPreview(opts.buf);
    const hasPii = preview.pii.header.hasPii || preview.pii.text.risk === "high" || preview.pii.text.risk === "medium";
    return {
      kind,
      previewTables: [{
        name: "CSV",
        headers: preview.headers,
        rows: preview.rows,
        totalRows: preview.totalRows,
      }],
      warnings,
      pii: {
        hasPii,
        risk: hasPii ? (preview.pii.header.hasPii ? "high" : preview.pii.text.risk) : "low",
        headerPii: preview.pii.header.piiColumns,
        textFindings: preview.pii.text.findings,
      },
    };
  }

  if (kind === "xlsx") {
    const preview = parseXlsxPreview(opts.buf);
    let hasPii = false;
    let maxRisk = "low";
    const allHeaderPii: { header: string; hint: string }[] = [];
    const allTextFindings: { type: string; count: number }[] = [];

    for (const table of preview.previewTables) {
      if (table.pii.header.hasPii) {
        hasPii = true;
        maxRisk = "high";
        allHeaderPii.push(...table.pii.header.piiColumns);
      }
      if (table.pii.text.risk === "high" || table.pii.text.risk === "medium") {
        hasPii = true;
        if (table.pii.text.risk === "high") maxRisk = "high";
        else if (maxRisk !== "high") maxRisk = "medium";
      }
      allTextFindings.push(...table.pii.text.findings);
    }

    return {
      kind,
      previewTables: preview.previewTables.map((t) => ({
        name: t.name,
        headers: t.headers,
        rows: t.rows,
        totalRows: t.totalRows,
      })),
      warnings,
      pii: {
        hasPii,
        risk: maxRisk,
        headerPii: allHeaderPii,
        textFindings: allTextFindings,
      },
    };
  }

  if (kind === "pdf") {
    warnings.push("PDF text extraction is not yet supported. Upload as text or spreadsheet for best results.");
    return {
      kind,
      previewText: "[PDF document - text extraction pending]",
      warnings,
      pii: { hasPii: false, risk: "unknown" },
    };
  }

  if (kind === "docx") {
    return await buildDocxPreview(opts.buf, warnings);
  }

  if (kind === "pptx") {
    return buildPptxPreview(opts.buf, warnings);
  }

  const text = opts.buf.toString("utf-8").substring(0, 10000);
  const textPii = scanTextForPii(text);
  const hasPii = textPii.risk === "high" || textPii.risk === "medium";

  return {
    kind,
    previewText: text.substring(0, 2000),
    warnings,
    pii: {
      hasPii,
      risk: textPii.risk,
      textFindings: textPii.findings,
    },
  };
}

export async function extractDocxText(buf: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || "";
  } catch {
    return "";
  }
}

export function extractPptxSlideText(buf: Buffer): string {
  return extractPptxText(buf);
}

async function buildDocxPreview(buf: Buffer, warnings: string[]): Promise<PreviewResult> {
  try {
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = result.value || "";
    if (!text || text.trim().length === 0) {
      warnings.push("DOCX document appears to be empty or could not be parsed.");
      return { kind: "docx", previewText: "", warnings, pii: { hasPii: false, risk: "low" } };
    }
    const truncated = text.substring(0, 10000);
    const textPii = scanTextForPii(truncated);
    const hasPii = textPii.risk === "high" || textPii.risk === "medium";
    return {
      kind: "docx",
      previewText: truncated.substring(0, 2000),
      warnings,
      pii: { hasPii, risk: textPii.risk, textFindings: textPii.findings },
    };
  } catch (err: any) {
    warnings.push(`DOCX parsing error: ${err.message || "unknown"}`);
    return { kind: "docx", previewText: "", warnings, pii: { hasPii: false, risk: "unknown" } };
  }
}

function extractPptxText(buf: Buffer): string {
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(buf);
    const entries = zip.getEntries();
    const slideEntries = entries
      .filter((e: any) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a: any, b: any) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || "0");
        const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || "0");
        return numA - numB;
      });

    const slideTexts: string[] = [];
    for (const entry of slideEntries) {
      const xml = entry.getData().toString("utf-8");
      const texts: string[] = [];
      const tagRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let match;
      while ((match = tagRegex.exec(xml)) !== null) {
        if (match[1].trim()) texts.push(match[1].trim());
      }
      if (texts.length > 0) {
        const slideNum = entry.entryName.match(/slide(\d+)/)?.[1] || "?";
        slideTexts.push(`--- Slide ${slideNum} ---\n${texts.join("\n")}`);
      }
    }
    return slideTexts.join("\n\n");
  } catch {
    return "";
  }
}

function buildPptxPreview(buf: Buffer, warnings: string[]): PreviewResult {
  const text = extractPptxText(buf);
  if (!text || text.trim().length === 0) {
    warnings.push("PPTX document appears to be empty or could not be parsed.");
    return { kind: "pptx", previewText: "", warnings, pii: { hasPii: false, risk: "low" } };
  }
  const truncated = text.substring(0, 10000);
  const textPii = scanTextForPii(truncated);
  const hasPii = textPii.risk === "high" || textPii.risk === "medium";
  return {
    kind: "pptx",
    previewText: truncated.substring(0, 2000),
    warnings,
    pii: { hasPii, risk: textPii.risk, textFindings: textPii.findings },
  };
}
