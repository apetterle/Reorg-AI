import { sanitizeCsv } from "./csv";
import { sanitizeXlsx } from "./xlsx";
import { detectKind } from "./preview";
import { redactText } from "../pii";

export function sanitizeBuffer(opts: { filename: string; mime?: string | null; buf: Buffer }): Buffer {
  const kind = detectKind(opts.filename, opts.mime);

  if (kind === "csv") {
    return sanitizeCsv(opts.buf);
  }

  if (kind === "xlsx") {
    return sanitizeXlsx(opts.buf);
  }

  const text = opts.buf.toString("utf-8");
  const sanitized = redactText(text);
  return Buffer.from(sanitized, "utf-8");
}
