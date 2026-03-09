const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_BR_PATTERN = /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)\d{4,5}-?\d{4}\b|\b\d{4,5}-\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;

const PII_HEADER_HINTS = [
  "cpf", "cnpj", "email", "e-mail", "telefone", "phone", "celular",
  "nome", "name", "rg", "endereco", "address", "cep", "ssn",
  "social_security", "birth_date", "data_nascimento", "mobile",
];

export interface PiiScanResult {
  risk: "low" | "medium" | "high" | "unknown";
  findings: { type: string; count: number }[];
}

export interface HeaderPiiScanResult {
  hasPii: boolean;
  piiColumns: { header: string; hint: string }[];
}

export function scanTextForPii(text: string): PiiScanResult {
  if (!text || text.length === 0) {
    return { risk: "unknown", findings: [] };
  }

  const findings: { type: string; count: number }[] = [];

  const cpfMatches = text.match(CPF_PATTERN);
  if (cpfMatches) findings.push({ type: "cpf", count: cpfMatches.length });

  const cnpjMatches = text.match(CNPJ_PATTERN);
  if (cnpjMatches) findings.push({ type: "cnpj", count: cnpjMatches.length });

  const emailMatches = text.match(EMAIL_PATTERN);
  if (emailMatches) findings.push({ type: "email", count: emailMatches.length });

  const phoneMatches = text.match(PHONE_BR_PATTERN);
  if (phoneMatches) findings.push({ type: "phone", count: phoneMatches.length });

  const ssnMatches = text.match(SSN_PATTERN);
  if (ssnMatches) findings.push({ type: "ssn", count: ssnMatches.length });

  if (findings.length === 0) return { risk: "low", findings };

  const totalFindings = findings.reduce((sum, f) => sum + f.count, 0);
  const hasCpf = findings.some((f) => f.type === "cpf");
  const hasCnpj = findings.some((f) => f.type === "cnpj");
  const hasSsn = findings.some((f) => f.type === "ssn");

  if (hasCpf || hasCnpj || hasSsn || totalFindings > 5) return { risk: "high", findings };
  if (totalFindings > 2) return { risk: "medium", findings };
  return { risk: "low", findings };
}

export function scanHeadersForPii(headers: string[]): HeaderPiiScanResult {
  const piiColumns: { header: string; hint: string }[] = [];
  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, "_");
    for (const hint of PII_HEADER_HINTS) {
      if (normalized === hint || normalized.includes(hint)) {
        piiColumns.push({ header, hint });
        break;
      }
    }
  }
  return { hasPii: piiColumns.length > 0, piiColumns };
}

export function getPiiColumnIndices(headers: string[]): number[] {
  const scan = scanHeadersForPii(headers);
  return scan.piiColumns.map((pc) => headers.indexOf(pc.header));
}

export function redactText(text: string): string {
  return text
    .replace(CPF_PATTERN, "[CPF REDACTED]")
    .replace(CNPJ_PATTERN, "[CNPJ REDACTED]")
    .replace(EMAIL_PATTERN, "[EMAIL REDACTED]")
    .replace(PHONE_BR_PATTERN, "[PHONE REDACTED]")
    .replace(SSN_PATTERN, "[SSN REDACTED]");
}

export function classifyDocumentKind(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const kindMap: Record<string, string> = {
    xlsx: "spreadsheet",
    xls: "spreadsheet",
    csv: "spreadsheet",
    pdf: "document",
    docx: "document",
    doc: "document",
    pptx: "presentation",
    ppt: "presentation",
    txt: "text",
    json: "data",
    xml: "data",
  };
  return kindMap[ext] || "unknown";
}
