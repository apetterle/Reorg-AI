import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalStorageAdapter } from "../server/storage-adapter";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let testDir: string;

  beforeAll(() => {
    testDir = path.join(os.tmpdir(), `reorg-test-storage-${Date.now()}`);
    adapter = new LocalStorageAdapter(testDir);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("creates base directory on construction", () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it("puts and gets an object", async () => {
    const content = Buffer.from("hello world");
    const result = await adapter.putObject({ key: "test/file.txt", body: content, contentType: "text/plain" });
    expect(result.key).toBe("test/file.txt");
    expect(result.sizeBytes).toBe(content.length);

    const retrieved = await adapter.getObject({ key: "test/file.txt" });
    expect(retrieved.toString("utf-8")).toBe("hello world");
  });

  it("creates nested directories", async () => {
    const content = Buffer.from("nested content");
    await adapter.putObject({ key: "a/b/c/deep.txt", body: content });
    const retrieved = await adapter.getObject({ key: "a/b/c/deep.txt" });
    expect(retrieved.toString("utf-8")).toBe("nested content");
  });

  it("checks existence correctly", async () => {
    await adapter.putObject({ key: "exists.txt", body: Buffer.from("yes") });
    expect(await adapter.exists({ key: "exists.txt" })).toBe(true);
    expect(await adapter.exists({ key: "does-not-exist.txt" })).toBe(false);
  });

  it("deletes objects", async () => {
    await adapter.putObject({ key: "to-delete.txt", body: Buffer.from("delete me") });
    expect(await adapter.exists({ key: "to-delete.txt" })).toBe(true);
    await adapter.deleteObject({ key: "to-delete.txt" });
    expect(await adapter.exists({ key: "to-delete.txt" })).toBe(false);
  });

  it("handles delete of non-existent file gracefully", async () => {
    await expect(adapter.deleteObject({ key: "never-existed.txt" })).resolves.toBeUndefined();
  });

  it("throws on get of non-existent file", async () => {
    await expect(adapter.getObject({ key: "missing.txt" })).rejects.toThrow();
  });

  it("overwrites existing files", async () => {
    await adapter.putObject({ key: "overwrite.txt", body: Buffer.from("version 1") });
    await adapter.putObject({ key: "overwrite.txt", body: Buffer.from("version 2") });
    const result = await adapter.getObject({ key: "overwrite.txt" });
    expect(result.toString("utf-8")).toBe("version 2");
  });

  it("handles binary content", async () => {
    const binary = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
    await adapter.putObject({ key: "binary.bin", body: binary });
    const result = await adapter.getObject({ key: "binary.bin" });
    expect(Buffer.compare(result, binary)).toBe(0);
  });

  it("returns null for public URL in local adapter", () => {
    const url = adapter.getPublicUrl({ key: "test.txt" });
    expect(url).toBeNull();
  });
});
