import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface PutObjectOutput {
  key: string;
  sizeBytes: number;
}

export interface GetObjectInput {
  key: string;
}

export interface DeleteObjectInput {
  key: string;
}

export interface StorageAdapter {
  putObject(input: PutObjectInput): Promise<PutObjectOutput>;
  getObject(input: GetObjectInput): Promise<Buffer>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  getPublicUrl(input: GetObjectInput): string | null;
  exists(input: GetObjectInput): Promise<boolean>;
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvedPath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async putObject(input: PutObjectInput): Promise<PutObjectOutput> {
    const filePath = this.resolvedPath(input.key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, input.body);
    return { key: input.key, sizeBytes: input.body.length };
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    const filePath = this.resolvedPath(input.key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${input.key}`);
    }
    return fs.readFileSync(filePath);
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    const filePath = this.resolvedPath(input.key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getPublicUrl(_input: GetObjectInput): string | null {
    return null;
  }

  async exists(input: GetObjectInput): Promise<boolean> {
    const filePath = this.resolvedPath(input.key);
    return fs.existsSync(filePath);
  }
}

export class R2StorageAdapter implements StorageAdapter {
  private client: any;
  private bucket: string;
  private publicUrlBase: string | null;

  constructor() {
    this.bucket = process.env.R2_BUCKET || "";
    this.publicUrlBase = process.env.R2_PUBLIC_URL || null;

    const endpoint = process.env.R2_ENDPOINT || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

    try {
      const { S3Client } = require("@aws-sdk/client-s3");
      this.client = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      logger.info("R2 storage adapter initialized", { source: "storage-adapter", bucket: this.bucket });
    } catch {
      logger.warn("@aws-sdk/client-s3 not installed; R2StorageAdapter will throw on use", { source: "storage-adapter" });
      this.client = null;
    }
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error("R2 storage adapter not available: @aws-sdk/client-s3 is not installed");
    }
  }

  async putObject(input: PutObjectInput): Promise<PutObjectOutput> {
    this.ensureClient();
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType || "application/octet-stream",
      })
    );
    return { key: input.key, sizeBytes: input.body.length };
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    this.ensureClient();
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      })
    );
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    this.ensureClient();
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      })
    );
  }

  getPublicUrl(input: GetObjectInput): string | null {
    if (!this.publicUrlBase) return null;
    return `${this.publicUrlBase}/${input.key}`;
  }

  async exists(input: GetObjectInput): Promise<boolean> {
    this.ensureClient();
    const { HeadObjectCommand } = require("@aws-sdk/client-s3");
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

let _instance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (_instance) return _instance;

  const useR2 =
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;

  if (useR2) {
    logger.info("Using R2 storage adapter", { source: "storage-adapter" });
    _instance = new R2StorageAdapter();
  } else {
    logger.info("Using local storage adapter", { source: "storage-adapter" });
    _instance = new LocalStorageAdapter();
  }

  return _instance;
}

export function buildStorageKey(
  tenantId: string,
  projectId: string,
  filename: string,
  sha256prefix?: string
): string {
  const timestamp = Date.now();
  const prefix = sha256prefix ? sha256prefix.substring(0, 8) : "00000000";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `tenants/${tenantId}/projects/${projectId}/uploads/${timestamp}-${prefix}-${safeName}`;
}
