import { claimJob, heartbeatJob } from "./claim";
import { processJob } from "./worker";
import { logger } from "../logger";
import crypto from "crypto";

let running = false;

export async function runLoop(
  workerId?: string,
  pollMs: number = 2000,
): Promise<void> {
  const wid = workerId || `worker-${crypto.randomBytes(4).toString("hex")}`;

  if (running) {
    logger.warn("Job runner already running, skipping duplicate start", { source: "job-runner", workerId: wid });
    return;
  }

  running = true;
  logger.info("Job runner started", { source: "job-runner", workerId: wid, pollMs });

  while (running) {
    try {
      const job = await claimJob(wid);
      if (job) {
        const heartbeatInterval = setInterval(async () => {
          try {
            await heartbeatJob(job.id, wid);
          } catch {
            // ignore heartbeat errors
          }
        }, 60_000);

        try {
          await processJob(job);
        } finally {
          clearInterval(heartbeatInterval);
        }
      } else {
        await sleep(pollMs);
      }
    } catch (err: any) {
      logger.error("Job runner loop error", { source: "job-runner", message: err.message });
      await sleep(pollMs * 2);
    }
  }

  logger.info("Job runner stopped", { source: "job-runner", workerId: wid });
}

export function stopLoop(): void {
  running = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
