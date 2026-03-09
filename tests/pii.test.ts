import { describe, it, expect } from "vitest";
import { scanTextForPii, redactText, classifyDocumentKind } from "../server/pii";

describe("scanTextForPii", () => {
  it("detects CPF patterns", () => {
    const result = scanTextForPii("Client CPF: 123.456.789-09");
    expect(result.findings.some((f) => f.type === "cpf")).toBe(true);
    expect(result.risk).toBe("high");
  });

  it("detects CPF without formatting", () => {
    const result = scanTextForPii("CPF: 12345678909");
    expect(result.findings.some((f) => f.type === "cpf")).toBe(true);
  });

  it("detects email addresses", () => {
    const result = scanTextForPii("Contact: user@example.com");
    expect(result.findings.some((f) => f.type === "email")).toBe(true);
  });

  it("detects Brazilian phone numbers", () => {
    const result = scanTextForPii("Phone: +55 11 98765-4321");
    expect(result.findings.some((f) => f.type === "phone")).toBe(true);
  });

  it("detects US SSN patterns", () => {
    const result = scanTextForPii("SSN: 123-45-6789");
    expect(result.findings.some((f) => f.type === "ssn")).toBe(true);
    expect(result.risk).toBe("high");
  });

  it("returns low risk for clean text", () => {
    const result = scanTextForPii("This is a clean document about quarterly revenue.");
    expect(result.risk).toBe("low");
    expect(result.findings.length).toBe(0);
  });

  it("returns unknown risk for empty text", () => {
    const result = scanTextForPii("");
    expect(result.risk).toBe("unknown");
  });

  it("classifies risk as high when CPF is found", () => {
    const result = scanTextForPii("CPF: 123.456.789-09");
    expect(result.risk).toBe("high");
  });

  it("classifies risk as high when SSN is found", () => {
    const result = scanTextForPii("SSN: 123-45-6789");
    expect(result.risk).toBe("high");
  });

  it("classifies risk as medium for moderate findings", () => {
    const result = scanTextForPii("email1@test.com email2@test.com email3@test.com");
    expect(result.risk).toBe("medium");
  });

  it("classifies risk as high for many findings", () => {
    const emails = Array.from({ length: 6 }, (_, i) => `user${i}@test.com`).join(" ");
    const result = scanTextForPii(emails);
    expect(result.risk).toBe("high");
  });
});

describe("redactText", () => {
  it("redacts CPF patterns", () => {
    const result = redactText("CPF: 123.456.789-09");
    expect(result).toBe("CPF: [CPF REDACTED]");
    expect(result).not.toContain("123.456.789-09");
  });

  it("redacts email addresses", () => {
    const result = redactText("Email: user@example.com");
    expect(result).toBe("Email: [EMAIL REDACTED]");
    expect(result).not.toContain("user@example.com");
  });

  it("redacts phone numbers", () => {
    const result = redactText("Phone: +55 11 98765-4321");
    expect(result).toContain("[PHONE REDACTED]");
    expect(result).not.toContain("98765-4321");
  });

  it("redacts SSN patterns", () => {
    const result = redactText("SSN: 123-45-6789");
    expect(result).toBe("SSN: [SSN REDACTED]");
    expect(result).not.toContain("123-45-6789");
  });

  it("redacts multiple PII types in same text", () => {
    const result = redactText("CPF: 123.456.789-09, email: test@mail.com, SSN: 987-65-4321");
    expect(result).toContain("[CPF REDACTED]");
    expect(result).toContain("[EMAIL REDACTED]");
    expect(result).toContain("[SSN REDACTED]");
  });

  it("leaves clean text unchanged", () => {
    const text = "Revenue was 150 million in Q4 2025";
    expect(redactText(text)).toBe(text);
  });
});

describe("classifyDocumentKind", () => {
  it("classifies spreadsheet files", () => {
    expect(classifyDocumentKind("report.xlsx")).toBe("spreadsheet");
    expect(classifyDocumentKind("data.csv")).toBe("spreadsheet");
    expect(classifyDocumentKind("old.xls")).toBe("spreadsheet");
  });

  it("classifies document files", () => {
    expect(classifyDocumentKind("report.pdf")).toBe("document");
    expect(classifyDocumentKind("memo.docx")).toBe("document");
  });

  it("classifies presentation files", () => {
    expect(classifyDocumentKind("slides.pptx")).toBe("presentation");
  });

  it("classifies data files", () => {
    expect(classifyDocumentKind("data.json")).toBe("data");
    expect(classifyDocumentKind("config.xml")).toBe("data");
  });

  it("returns unknown for unrecognized extensions", () => {
    expect(classifyDocumentKind("file.xyz")).toBe("unknown");
  });
});
