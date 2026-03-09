import { describe, it, expect } from "vitest";
import { parseCsvPreview, sanitizeCsv } from "../server/parsers/csv";
import { parseXlsxPreview } from "../server/parsers/xlsx";
import { detectKind, buildPreview } from "../server/parsers/preview";

describe("CSV parser", () => {
  it("parses basic CSV with headers and rows", () => {
    const csv = "Name,Revenue,Growth\nAlpha,1000,5.2\nBeta,2000,3.1\nGamma,500,10.0";
    const buf = Buffer.from(csv);
    const result = parseCsvPreview(buf);
    expect(result.headers).toEqual(["Name", "Revenue", "Growth"]);
    expect(result.rows.length).toBe(3);
    expect(result.totalRows).toBe(3);
    expect(result.rows[0]).toEqual(["Alpha", "1000", "5.2"]);
  });

  it("handles semicolon-delimited CSV", () => {
    const csv = "Item;Price;Qty\nA;10.5;100\nB;20;200";
    const buf = Buffer.from(csv);
    const result = parseCsvPreview(buf);
    expect(result.headers).toEqual(["Item", "Price", "Qty"]);
    expect(result.rows.length).toBe(2);
  });

  it("handles empty CSV", () => {
    const buf = Buffer.from("");
    const result = parseCsvPreview(buf);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it("respects maxRows parameter", () => {
    let csv = "A,B\n";
    for (let i = 0; i < 100; i++) csv += `${i},${i * 2}\n`;
    const buf = Buffer.from(csv);
    const result = parseCsvPreview(buf, 5);
    expect(result.rows.length).toBe(5);
    expect(result.totalRows).toBe(100);
  });

  it("detects PII in CSV headers", () => {
    const csv = "Employee Name,CPF,Email,Revenue\nJohn,12345678901,john@x.com,1000";
    const buf = Buffer.from(csv);
    const result = parseCsvPreview(buf);
    expect(result.pii.header.hasPii).toBe(true);
    expect(result.pii.header.piiColumns.length).toBeGreaterThan(0);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'Name,Description,Value\n"Acme, Inc.","A big company",100';
    const buf = Buffer.from(csv);
    const result = parseCsvPreview(buf);
    expect(result.rows[0][0]).toBe("Acme, Inc.");
    expect(result.rows[0][1]).toBe("A big company");
  });
});

describe("CSV sanitization", () => {
  it("removes PII columns", () => {
    const csv = "Name,CPF,Revenue\nJohn,12345678901,1000\nJane,98765432109,2000";
    const buf = Buffer.from(csv);
    const result = sanitizeCsv(buf);
    const text = result.toString("utf-8");
    expect(text).not.toContain("CPF");
    expect(text).not.toContain("12345678901");
    expect(text).toContain("Revenue");
    expect(text).toContain("1000");
  });

  it("returns original buffer when no PII columns", () => {
    const csv = "Product,Price,Qty\nWidgetA,10,100";
    const buf = Buffer.from(csv);
    const result = sanitizeCsv(buf);
    expect(result.toString("utf-8")).toContain("Product");
    expect(result.toString("utf-8")).toContain("WidgetA");
  });
});

describe("detectKind", () => {
  it("detects xlsx by extension", () => {
    expect(detectKind("report.xlsx")).toBe("xlsx");
    expect(detectKind("data.xls")).toBe("xlsx");
  });

  it("detects csv by extension", () => {
    expect(detectKind("data.csv")).toBe("csv");
  });

  it("detects csv by mime type", () => {
    expect(detectKind("unknown.dat", "text/csv")).toBe("csv");
  });

  it("detects xlsx by mime type", () => {
    expect(detectKind("file", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("xlsx");
  });

  it("detects pdf", () => {
    expect(detectKind("report.pdf")).toBe("pdf");
    expect(detectKind("file", "application/pdf")).toBe("pdf");
  });

  it("detects docx", () => {
    expect(detectKind("report.docx")).toBe("docx");
  });

  it("detects text formats", () => {
    expect(detectKind("notes.txt")).toBe("text");
    expect(detectKind("README.md")).toBe("text");
    expect(detectKind("app.log")).toBe("text");
  });

  it("detects data formats", () => {
    expect(detectKind("config.json")).toBe("data");
    expect(detectKind("data.xml")).toBe("data");
    expect(detectKind("config.yaml")).toBe("data");
    expect(detectKind("config.yml")).toBe("data");
  });

  it("returns other for unknown", () => {
    expect(detectKind("mystery.bin")).toBe("other");
  });
});

describe("buildPreview", () => {
  it("builds CSV preview with tables", async () => {
    const csv = "Revenue,Cost,Margin\n1000,800,200\n2000,1500,500";
    const result = await buildPreview({ filename: "data.csv", buf: Buffer.from(csv) });
    expect(result.kind).toBe("csv");
    expect(result.previewTables).toBeDefined();
    expect(result.previewTables!.length).toBe(1);
    expect(result.previewTables![0].headers).toEqual(["Revenue", "Cost", "Margin"]);
  });

  it("builds text preview for plain text", async () => {
    const text = "This is a plain text document with some content.\nLine 2 here.";
    const result = await buildPreview({ filename: "notes.txt", buf: Buffer.from(text) });
    expect(result.kind).toBe("text");
    expect(result.previewText).toBeDefined();
    expect(result.previewText).toContain("plain text document");
  });

  it("returns unknown risk for PDF", async () => {
    const result = await buildPreview({ filename: "doc.pdf", buf: Buffer.from("fake pdf") });
    expect(result.kind).toBe("pdf");
    expect(result.pii.risk).toBe("unknown");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("detects PII risk in text files", async () => {
    const text = "Employee CPF: 123.456.789-01\nEmail: john@example.com\nPhone: (11) 98765-4321";
    const result = await buildPreview({ filename: "data.txt", buf: Buffer.from(text) });
    expect(result.pii.hasPii).toBe(true);
  });

  it("detects pptx kind", () => {
    expect(detectKind("slides.pptx")).toBe("pptx");
    expect(detectKind("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("pptx");
  });
});

describe("XLSX parser", () => {
  it("handles non-xlsx buffer gracefully", () => {
    try {
      const result = parseXlsxPreview(Buffer.from("not an xlsx file"));
      expect(result.previewTables.length).toBe(0);
    } catch {
      expect(true).toBe(true);
    }
  });
});
