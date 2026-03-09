import * as XLSX from "xlsx";
import { scanHeadersForPii, scanTextForPii, getPiiColumnIndices, type PiiScanResult, type HeaderPiiScanResult } from "../pii";

export interface XlsxSheetPreview {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  pii: {
    header: HeaderPiiScanResult;
    text: PiiScanResult;
  };
}

export interface XlsxPreview {
  sheets: string[];
  previewTables: XlsxSheetPreview[];
}

export function parseXlsxPreview(buf: Buffer, maxRows: number = 30): XlsxPreview {
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheets = workbook.SheetNames;
  const previewTables: XlsxSheetPreview[] = [];

  for (const sheetName of sheets.slice(0, 5)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    if (jsonData.length === 0) continue;

    const headers = (jsonData[0] || []).map((h: any) => String(h));
    const rows: string[][] = [];
    for (let i = 1; i < Math.min(jsonData.length, maxRows + 1); i++) {
      rows.push((jsonData[i] || []).map((c: any) => String(c)));
    }

    const headerPii = scanHeadersForPii(headers);
    const sampleText = jsonData
      .slice(0, Math.min(jsonData.length, 50))
      .map((r: any[]) => r.join(" "))
      .join("\n");
    const textPii = scanTextForPii(sampleText);

    previewTables.push({
      name: sheetName,
      headers,
      rows,
      totalRows: Math.max(0, jsonData.length - 1),
      pii: { header: headerPii, text: textPii },
    });
  }

  return { sheets, previewTables };
}

export function sanitizeXlsx(buf: Buffer): Buffer {
  const workbook = XLSX.read(buf, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    if (jsonData.length === 0) continue;

    const headers = (jsonData[0] || []).map((h: any) => String(h));
    const piiIndices = getPiiColumnIndices(headers);
    if (piiIndices.length === 0) continue;

    const keepIndices = headers.map((_, i) => i).filter((i) => !piiIndices.includes(i));
    const cleanData = jsonData.map((row: any[]) =>
      keepIndices.map((i) => row[i] !== undefined ? row[i] : "")
    );

    const newSheet = XLSX.utils.aoa_to_sheet(cleanData);
    workbook.Sheets[sheetName] = newSheet;
  }

  const outBuf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(outBuf);
}
