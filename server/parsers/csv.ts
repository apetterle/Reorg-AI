import { scanHeadersForPii, scanTextForPii, getPiiColumnIndices, type PiiScanResult, type HeaderPiiScanResult } from "../pii";

export interface CsvPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  pii: {
    header: HeaderPiiScanResult;
    text: PiiScanResult;
  };
}

export function parseCsvPreview(buf: Buffer, maxRows: number = 30): CsvPreview {
  const text = buf.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      pii: {
        header: { hasPii: false, piiColumns: [] },
        text: { risk: "low", findings: [] },
      },
    };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    rows.push(parseCsvLine(lines[i]));
  }

  const headerPii = scanHeadersForPii(headers);
  const sampleText = lines.slice(0, Math.min(lines.length, 50)).join("\n");
  const textPii = scanTextForPii(sampleText);

  return {
    headers,
    rows,
    totalRows: lines.length - 1,
    pii: { header: headerPii, text: textPii },
  };
}

export function sanitizeCsv(buf: Buffer): Buffer {
  const text = buf.toString("utf-8");
  const lines = text.split(/\r?\n/);

  if (lines.length === 0) return buf;

  const headers = parseCsvLine(lines[0]);
  const piiIndices = getPiiColumnIndices(headers);

  if (piiIndices.length === 0) return buf;

  const keepIndices = headers.map((_, i) => i).filter((i) => !piiIndices.includes(i));

  const sanitizedLines = lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const fields = parseCsvLine(line);
      return keepIndices.map((i) => escapeCsvField(fields[i] || "")).join(",");
    });

  return Buffer.from(sanitizedLines.join("\n"), "utf-8");
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
