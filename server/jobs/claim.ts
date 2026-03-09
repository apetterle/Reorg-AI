import { storage } from "../storage";
import { logger } from "../logger";
import type { Job } from "@shared/schema";

export async function claimJob(workerId: string, lockMinutes: number = 10): Promise<Job | undefined> {
  const job = await storage.claimNextJob(workerId, lockMinutes);
  if (job) {
    logger.info("Job claimed", {
      source: "job-runner",
      jobId: job.id,
      workerId,
      type: job.type,
      attempt: job.attempt,
    });
  }
  return job;
}

export async function heartbeatJob(jobId: string, workerId: string, lockMinutes: number = 10): Promise<void> {
  await storage.heartbeatJob(jobId, workerId, lockMinutes);
  logger.debug("Job heartbeat", { source: "job-runner", jobId, workerId });
}
