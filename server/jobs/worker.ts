import { storage } from "../storage";
import { logger } from "../logger";
import type { Job, JobStep } from "@shared/schema";
import { processIngest } from "./processors/ingest";
import { processExtract } from "./processors/extract";
import { processValueScope } from "./processors/valuescope";
import { processSanitize } from "./processors/sanitize";
import { processExport } from "./processors/export";
import { processPhaseRun } from "./processors/phase-run";
import { processNormalize } from "./processors/normalize";
import { broadcastJobProgress, broadcastJobCompleted, broadcastJobFailed } from "../ws";
import { sendEmail, buildPhaseCompleteEmail } from "../email";

type ProcessorFn = (job: Job) => Promise<void>;

const processors: Record<string, ProcessorFn> = {
  ingest_documents_v1: processIngest,
  ingest: processIngest,
  extract_facts_v1: processExtract,
  extract: processExtract,
  valuescope_v1: processValueScope,
  valuescope: processValueScope,
  sanitize_document_v1: processSanitize,
  export_v1: processExport,
  normalize_document_v1: processNormalize,
  phase_0_run_v1: processPhaseRun,
  phase_1_run_v1: processPhaseRun,
  phase_2_run_v1: processPhaseRun,
  phase_3_run_v1: processPhaseRun,
  phase_4_run_v1: processPhaseRun,
  phase_5_run_v1: processPhaseRun,
  phase_6_run_v1: processPhaseRun,
  phase_7_run_v1: processPhaseRun,
};

export async function upsertStep(
  jobId: string,
  stepName: string,
  patch: Partial<JobStep>,
): Promise<JobStep> {
  return storage.upsertJobStep(jobId, stepName, patch);
}

export async function step<T>(
  jobId: string,
  name: string,
  fn: () => Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  await upsertStep(jobId, name, {
    status: "running",
    startedAt: new Date(),
    timeoutMs: timeoutMs || null,
  });

  try {
    let result: T;
    if (timeoutMs && timeoutMs > 0) {
      result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Step "${name}" timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } else {
      result = await fn();
    }
    await upsertStep(jobId, name, {
      status: "succeeded",
      finishedAt: new Date(),
      outputJson: result !== undefined ? (result as any) : null,
    });
    return result;
  } catch (err: any) {
    await upsertStep(jobId, name, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: err.message,
      errorJson: { message: err.message, stack: err.stack },
    });
    throw err;
  }
}

export async function processJob(job: Job): Promise<void> {
  const processor = processors[job.type];
  if (!processor) {
    logger.error("Unknown job type", { source: "job-runner", jobId: job.id, type: job.type });
    await storage.updateJob(job.id, {
      status: "failed",
      errorMessage: `Unknown job type: ${job.type}`,
      errorJson: { code: "UNKNOWN_JOB_TYPE", type: job.type },
    });
    return;
  }

  try {
    logger.info("Processing job", {
      source: "job-runner",
      jobId: job.id,
      type: job.type,
      projectId: job.projectId,
      tenantId: job.tenantId,
      attempt: job.attempt,
    });

    if (job.projectId) {
      broadcastJobProgress(job.projectId, job.id, "running", { type: job.type });
    }

    await processor(job);

    await storage.updateJob(job.id, { status: "succeeded" });
    logger.info("Job succeeded", { source: "job-runner", jobId: job.id, type: job.type, projectId: job.projectId, tenantId: job.tenantId });

    if (job.projectId) {
      broadcastJobCompleted(job.projectId, job.id);
    }

    if (job.type.startsWith("phase_") && job.type.endsWith("_run_v1") && job.projectId && job.tenantId) {
      try {
        const phaseNum = parseInt(job.type.replace("phase_", "").replace("_run_v1", ""), 10);
        const phaseNames: Record<number, string> = {
          0: "Readiness Assessment", 1: "ValueScope", 2: "ZeroBase Rebuild",
          3: "SmartStack", 4: "ValueCase", 5: "OrgDNA", 6: "AI PolicyCore", 7: "AdoptLoop",
        };
        const project = await storage.getProject(job.projectId);
        if (project) {
          const members = await storage.getMembershipsForTenant(job.tenantId);
          const baseUrl = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : "https://reorg.ai";
          const tenant = await storage.getTenant(job.tenantId);
          const projectUrl = `${baseUrl}/t/${tenant?.slug || ""}/projects/${project.id}`;
          const emailMsg = buildPhaseCompleteEmail(
            project.name, phaseNum, phaseNames[phaseNum] || `Phase ${phaseNum}`, projectUrl
          );
          for (const m of members) {
            if (m.user.email) {
              await sendEmail({ ...emailMsg, to: m.user.email });
            }
          }
        }
      } catch (emailErr: any) {
        logger.warn("Phase completion email failed", { source: "email", message: emailErr.message });
      }
    }
  } catch (err: any) {
    logger.error("Job failed", {
      source: "job-runner",
      jobId: job.id,
      type: job.type,
      projectId: job.projectId,
      tenantId: job.tenantId,
      message: err.message,
    });

    const canRetry = job.attempt < job.maxAttempts;
    if (canRetry) {
      const backoffMs = Math.min(30000, 2000 * Math.pow(2, job.attempt));
      await storage.updateJob(job.id, {
        status: "queued",
        lockedBy: null,
        lockedUntil: null,
        runAfter: new Date(Date.now() + backoffMs),
        errorMessage: err.message,
        errorJson: { message: err.message, attempt: job.attempt },
      });
      logger.info("Job re-queued for retry", {
        source: "job-runner",
        jobId: job.id,
        attempt: job.attempt,
        nextRunAfter: backoffMs,
      });
    } else {
      await storage.updateJob(job.id, {
        status: "failed",
        errorMessage: err.message,
        errorJson: { message: err.message, attempt: job.attempt, maxAttempts: job.maxAttempts },
      });
    }

    if (job.projectId) {
      broadcastJobFailed(job.projectId, job.id, err.message);
    }
  }
}
