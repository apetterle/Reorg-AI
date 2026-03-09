import { storage } from "../../storage";
import { logger } from "../../logger";
import { classifyDocumentKind } from "../../pii";
import { getStorage } from "../../storage-adapter";
import { buildPreview } from "../../parsers/preview";
import { step } from "../worker";
import type { Job } from "@shared/schema";

export async function processIngest(job: Job): Promise<void> {
  const { projectId, tenantId } = job;

  const result = await step(job.id, "classify_documents", async () => {
    const docs = await storage.getDocumentsForProject(projectId);
    const readyDocs = docs.filter((d) => d.status === "ready" || d.status === "uploaded");
    const objectStorage = getStorage();
    let processed = 0;

    for (const doc of readyDocs) {
      const kind = classifyDocumentKind(doc.filename);

      let containsPii = false;
      let piiRisk = "unknown";
      let piiScanJson: any = null;

      const exists = await objectStorage.exists({ key: doc.storageKey });
      if (exists) {
        const buf = await objectStorage.getObject({ key: doc.storageKey });
        const preview = await buildPreview({ filename: doc.filename, mime: doc.mimeType, buf });
        containsPii = preview.pii.hasPii;
        piiRisk = preview.pii.risk;
        piiScanJson = preview.pii;
      }

      const newStatus = containsPii ? "blocked" : "ingested";

      await storage.updateDocument(doc.id, {
        kind,
        status: newStatus,
        piiRisk,
        containsPii,
        piiScanJson,
        piiScannedAt: new Date(),
      });

      processed++;
      const progress = ((processed / readyDocs.length) * 100).toFixed(2);
      await storage.updateJob(job.id, { progress });
    }

    return { processedDocs: processed };
  });

  await storage.updateJob(job.id, { resultJson: result });
  logger.info("Ingest job completed", { source: "jobs", jobId: job.id, ...result });
  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, result, projectId);
}
