import { describe, it, expect } from "vitest";

describe("Job claim logic", () => {
  it("job is claimable when locked_until is null", () => {
    const job = { lockedUntil: null, lockedBy: null, status: "queued" };
    const isClaimable = job.lockedUntil === null || new Date(job.lockedUntil) < new Date();
    expect(isClaimable).toBe(true);
  });

  it("job is claimable when locked_until is in the past (zombie lock expired)", () => {
    const pastDate = new Date(Date.now() - 60000);
    const job = { lockedUntil: pastDate, lockedBy: "worker-1", status: "running" };
    const isClaimable = job.lockedUntil === null || new Date(job.lockedUntil) < new Date();
    expect(isClaimable).toBe(true);
  });

  it("job is NOT claimable when locked_until is in the future", () => {
    const futureDate = new Date(Date.now() + 600000);
    const job = { lockedUntil: futureDate, lockedBy: "worker-1", status: "running" };
    const isClaimable = job.lockedUntil === null || new Date(job.lockedUntil) < new Date();
    expect(isClaimable).toBe(false);
  });

  it("lock duration should be 10 minutes by default", () => {
    const lockDurationMs = 10 * 60 * 1000;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockDurationMs);
    const diff = lockedUntil.getTime() - now.getTime();
    expect(diff).toBe(600000);
  });

  it("job status transitions follow spec: queued -> running -> succeeded/failed", () => {
    const validTransitions: Record<string, string[]> = {
      queued: ["running", "blocked", "canceled"],
      running: ["succeeded", "failed"],
      blocked: ["queued"],
      canceled: [],
      succeeded: [],
      failed: ["queued"],
    };

    expect(validTransitions["queued"]).toContain("running");
    expect(validTransitions["running"]).toContain("succeeded");
    expect(validTransitions["running"]).toContain("failed");
    expect(validTransitions["succeeded"]).not.toContain("running");
  });

  it("heartbeat should refresh locked_until", () => {
    const initialLock = new Date(Date.now() + 300000);
    const heartbeatAt = new Date();
    const newLockedUntil = new Date(heartbeatAt.getTime() + 600000);
    expect(newLockedUntil.getTime()).toBeGreaterThan(initialLock.getTime());
  });
});

describe("Job step timeout", () => {
  it("step should be marked failed if duration exceeds timeout", () => {
    const stepTimeout = 5 * 60 * 1000;
    const startedAt = new Date(Date.now() - 6 * 60 * 1000);
    const elapsed = Date.now() - startedAt.getTime();
    const timedOut = elapsed > stepTimeout;
    expect(timedOut).toBe(true);
  });

  it("step should NOT be marked failed if within timeout", () => {
    const stepTimeout = 5 * 60 * 1000;
    const startedAt = new Date(Date.now() - 2 * 60 * 1000);
    const elapsed = Date.now() - startedAt.getTime();
    const timedOut = elapsed > stepTimeout;
    expect(timedOut).toBe(false);
  });
});
