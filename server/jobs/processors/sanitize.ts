import { storage } from "../../storage";
import { logger } from "../../logger";
import { getStorage } from "../../storage-adapter";
import { sanitizeBuffer } from "../../parsers/sanitize";
import { detectKind } from "../../parsers/preview";
import { step } from "../worker";
import type { Job } from "@shared/schema";

export async function processSanitize(job: Job): Promise<void> {
  const { tenantId } = job;
  const inputJson = job.inputJson as any;
  const documentId = inputJson?.documentId;

  if (!documentId) {
    throw new Error("documentId is required in inputJson");
  }

  const result = await step(job.id, "sanitize_document", async () => {
    const doc = await storage.getDocument(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const objectStorage = getStorage();
    const exists = await objectStorage.exists({ key: doc.storageKey });
    if (!exists) throw new Error(`File not found: ${doc.storageKey}`);

    const kind = detectKind(doc.filename, doc.mimeType);
    const supportedKinds = ["csv", "xlsx", "text", "data"];
    if (!supportedKinds.includes(kind)) {
      throw new Error(`Cannot auto-sanitize ${kind} files (${doc.filename}). Delete and re-upload a clean version.`);
    }

    const buf = await objectStorage.getObject({ key: doc.storageKey });
    const sanitized = sanitizeBuffer({ filename: doc.filename, mime: doc.mimeType, buf });
    const sanitizedKey = doc.storageKey.replace(/\/uploads\//, "/sanitized/");
    await objectStorage.putObject({ key: sanitizedKey, body: sanitized, contentType: doc.mimeType || "application/octet-stream" });

    await storage.updateDocument(doc.id, {
      status: "ready",
      piiRisk: "low",
      containsPii: false,
      sanitizedAt: new Date(),
      sanitizationJobId: job.id,
      storageKey: sanitizedKey,
      originalStorageKey: doc.storageKey,
    });

    return { documentId: doc.id, sanitizedKey };
  });

  await storage.updateJob(job.id, { resultJson: result });
  logger.info("Sanitize job completed", { source: "jobs", jobId: job.id, ...result });
  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, result, projectId);
}
