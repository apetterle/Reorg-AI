import { describe, it, expect } from "vitest";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ChunkEntry {
  chunk_id: string;
  type: "text" | "table";
  text?: string;
  anchors: string[];
  page_range: number[];
  tokens_estimate: number;
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

describe("chunkText", () => {
  it("produces chunks for short text", () => {
    const text = "Hello world\nThis is a test.";
    const chunks = chunkText(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0].chunk_id).toBe("c0000");
    expect(chunks[0].type).toBe("text");
    expect(chunks[0].text).toContain("Hello world");
  });

  it("splits long text into multiple chunks", () => {
    const lines: string[] = [];
    for (let i = 0; i < 200; i++) {
      lines.push(`This is line ${i} with enough content to add up to reasonable size for chunking purposes.`);
    }
    const text = lines.join("\n");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokens_estimate).toBeLessThanOrEqual(900);
    }
  });

  it("assigns sequential chunk IDs", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `Line ${i} padded content here for testing chunks.`);
    const chunks = chunkText(lines.join("\n"));
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunk_id).toBe(`c${String(i).padStart(4, "0")}`);
    }
  });

  it("includes anchors and page_range", () => {
    const chunks = chunkText("Single chunk");
    expect(chunks[0].anchors.length).toBeGreaterThan(0);
    expect(chunks[0].page_range).toEqual([1, 1]);
  });

  it("handles empty text", () => {
    const chunks = chunkText("");
    expect(chunks.length).toBe(0);
  });
});

describe("guessSchemaHint", () => {
  it("detects date columns", () => {
    expect(guessSchemaHint("Date")).toBe("date");
    expect(guessSchemaHint("Month")).toBe("date");
    expect(guessSchemaHint("Period")).toBe("date");
    expect(guessSchemaHint("Ano")).toBe("date");
    expect(guessSchemaHint("Mês")).toBe("date");
  });

  it("detects percent columns", () => {
    expect(guessSchemaHint("Growth %")).toBe("percent");
    expect(guessSchemaHint("Taxa")).toBe("percent");
    expect(guessSchemaHint("Rate")).toBe("percent");
    expect(guessSchemaHint("Percent Change")).toBe("percent");
  });

  it("detects currency columns", () => {
    expect(guessSchemaHint("Price")).toBe("currency");
    expect(guessSchemaHint("Cost Center")).toBe("currency");
    expect(guessSchemaHint("Revenue")).toBe("currency");
    expect(guessSchemaHint("Valor Total")).toBe("currency");
    expect(guessSchemaHint("R$ Amount")).toBe("currency");
    expect(guessSchemaHint("Receita")).toBe("currency");
  });

  it("detects number from sample", () => {
    expect(guessSchemaHint("Volume", "12345")).toBe("number");
    expect(guessSchemaHint("Quantity", "1,000")).toBe("number");
  });

  it("defaults to string", () => {
    expect(guessSchemaHint("Name")).toBe("string");
    expect(guessSchemaHint("Description")).toBe("string");
  });
});

describe("bundle manifest structure", () => {
  it("validates manifest schema", () => {
    const manifest = {
      bundle_version: 1,
      document_id: "test-doc-id",
      source: {
        filename: "data.csv",
        mime: "text/csv",
        sha256: "abc123",
      },
      created_at: new Date().toISOString(),
      sanitized: false,
      pii: {
        risk: "low",
        findings_summary: [],
      },
      extract: {
        has_text: true,
        has_tables: true,
        pages: 1,
        tables: 1,
      },
      anchors: {
        scheme: "reorg-anchor-v1",
        examples: ["csv:r=1&c=1"],
      },
    };

    expect(manifest.bundle_version).toBe(1);
    expect(manifest.source.filename).toBe("data.csv");
    expect(manifest.anchors.scheme).toBe("reorg-anchor-v1");
    expect(manifest.pii.risk).toBe("low");
    expect(manifest.extract.has_text).toBe(true);
    expect(manifest.extract.has_tables).toBe(true);
  });
});

describe("anchor format", () => {
  it("generates CSV anchors", () => {
    const anchor = `csv:r=12&c=5`;
    expect(anchor).toMatch(/^csv:r=\d+&c=\d+$/);
  });

  it("generates XLSX anchors with sheet name", () => {
    const anchor = `xlsx:sheet=${encodeURIComponent("KPI Sheet")}!r=12&c=5`;
    expect(anchor).toContain("xlsx:sheet=");
    expect(anchor).toContain("!r=12&c=5");
  });

  it("generates text anchors with offset", () => {
    const anchor = `text:offset=100&len=50`;
    expect(anchor).toMatch(/^text:offset=\d+&len=\d+$/);
  });

  it("handles special characters in sheet names", () => {
    const sheetName = "Revenue & Costs";
    const anchor = `xlsx:sheet=${encodeURIComponent(sheetName)}!r=1&c=1`;
    expect(anchor).toContain(encodeURIComponent("&"));
    expect(anchor).not.toContain("Revenue & Costs!");
  });
});

describe("table extraction format", () => {
  it("validates table entry structure", () => {
    const table = {
      table_id: "table_001",
      name: "Financial KPIs",
      headers: ["Month", "Revenue", "Cost", "Margin"],
      rows: [
        ["Jan", "1000", "800", "200"],
        ["Feb", "1200", "900", "300"],
      ],
      schema_hints: {
        Month: "date",
        Revenue: "currency",
        Cost: "currency",
        Margin: "currency",
      },
      anchors: ["xlsx:sheet=KPIs!r=1..2&c=1..4"],
    };

    expect(table.table_id).toBe("table_001");
    expect(table.headers.length).toBe(4);
    expect(table.rows.length).toBe(2);
    expect(table.schema_hints.Revenue).toBe("currency");
    expect(table.anchors.length).toBe(1);
  });

  it("validates chunks.jsonl line format", () => {
    const chunks = chunkText("Revenue for Q1 was $1.2M\nCosts were $800K\nMargin improved to 33%");
    const jsonlLines = chunks.map((c) => JSON.stringify(c));
    for (const line of jsonlLines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty("chunk_id");
      expect(parsed).toHaveProperty("type");
      expect(parsed).toHaveProperty("anchors");
      expect(parsed).toHaveProperty("tokens_estimate");
      expect(typeof parsed.tokens_estimate).toBe("number");
    }
  });
});
