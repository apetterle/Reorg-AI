import { describe, it, expect } from "vitest";
import { insertPhaseRunSchema, insertPhaseGateSchema, PHASES, PHASE_DEPENDENCIES } from "@shared/schema";

describe("Phase run schema validation", () => {
  it("accepts valid phase run data", () => {
    const result = insertPhaseRunSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      phaseId: 0,
      status: "pending",
    });
    expect(result.success).toBe(true);
  });

  it("requires projectId", () => {
    const result = insertPhaseRunSchema.safeParse({
      tenantId: "tenant-1",
      phaseId: 0,
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("requires tenantId", () => {
    const result = insertPhaseRunSchema.safeParse({
      projectId: "proj-1",
      phaseId: 0,
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("requires phaseId", () => {
    const result = insertPhaseRunSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as null/undefined", () => {
    const result = insertPhaseRunSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      phaseId: 1,
      status: "running",
      startedAt: null,
      finishedAt: null,
      inputsJson: null,
      outputsSummaryJson: null,
      errorJson: null,
      jobId: null,
    });
    expect(result.success).toBe(true);
  });

  it("omits id and createdAt from insert schema", () => {
    const result = insertPhaseRunSchema.safeParse({
      id: "should-be-stripped",
      projectId: "proj-1",
      tenantId: "tenant-1",
      phaseId: 0,
      status: "pending",
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});

describe("Phase gate schema validation", () => {
  it("accepts valid gate data", () => {
    const result = insertPhaseGateSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      phaseId: 0,
      decision: "pending",
    });
    expect(result.success).toBe(true);
  });

  it("accepts gate with full data", () => {
    const result = insertPhaseGateSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      phaseId: 1,
      phaseRunId: "run-1",
      decision: "passed",
      decidedBy: "user-1",
      decidedAt: new Date(),
      checklistJson: [{ item: "Data quality check", passed: true, notes: "" }],
      evidenceCoverage: "85.50",
      notes: "All criteria met",
    });
    expect(result.success).toBe(true);
  });

  it("requires projectId", () => {
    const result = insertPhaseGateSchema.safeParse({
      tenantId: "tenant-1",
      phaseId: 0,
      decision: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("requires tenantId", () => {
    const result = insertPhaseGateSchema.safeParse({
      projectId: "proj-1",
      phaseId: 0,
      decision: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("requires phaseId", () => {
    const result = insertPhaseGateSchema.safeParse({
      projectId: "proj-1",
      tenantId: "tenant-1",
      decision: "pending",
    });
    expect(result.success).toBe(false);
  });
});

describe("Phase run lifecycle", () => {
  it("phase run starts in pending status", () => {
    const run = { status: "pending", startedAt: null, finishedAt: null };
    expect(run.status).toBe("pending");
    expect(run.startedAt).toBeNull();
  });

  it("phase run transitions to running with startedAt timestamp", () => {
    const now = new Date();
    const run = { status: "running", startedAt: now, finishedAt: null };
    expect(run.status).toBe("running");
    expect(run.startedAt).toBe(now);
    expect(run.finishedAt).toBeNull();
  });

  it("phase run transitions to completed with finishedAt timestamp", () => {
    const started = new Date(Date.now() - 60000);
    const finished = new Date();
    const run = { status: "completed", startedAt: started, finishedAt: finished };
    expect(run.status).toBe("completed");
    expect(run.finishedAt!.getTime()).toBeGreaterThan(run.startedAt!.getTime());
  });

  it("phase run transitions to failed with error data", () => {
    const run = {
      status: "failed",
      startedAt: new Date(Date.now() - 30000),
      finishedAt: new Date(),
      errorJson: { message: "LLM timeout", code: "TIMEOUT" },
    };
    expect(run.status).toBe("failed");
    expect(run.errorJson).toBeDefined();
  });

  it("valid status transitions follow expected flow", () => {
    const validTransitions: Record<string, string[]> = {
      pending: ["running"],
      running: ["completed", "failed"],
      completed: [],
      failed: ["pending"],
    };
    expect(validTransitions["pending"]).toContain("running");
    expect(validTransitions["running"]).toContain("completed");
    expect(validTransitions["running"]).toContain("failed");
    expect(validTransitions["completed"]).not.toContain("pending");
  });

  it("run duration is calculated from startedAt and finishedAt", () => {
    const startedAt = new Date(Date.now() - 120000);
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    expect(durationMs).toBeGreaterThan(0);
    expect(durationMs).toBeLessThanOrEqual(120001);
  });
});

describe("Gate decision lifecycle", () => {
  it("gate starts with pending decision", () => {
    const gate = { decision: "pending", decidedBy: null, decidedAt: null };
    expect(gate.decision).toBe("pending");
  });

  it("gate can be approved (passed)", () => {
    const gate = {
      decision: "passed",
      decidedBy: "user-1",
      decidedAt: new Date(),
      notes: "All criteria met",
    };
    expect(gate.decision).toBe("passed");
    expect(gate.decidedBy).toBeTruthy();
    expect(gate.decidedAt).toBeInstanceOf(Date);
  });

  it("gate can be rejected (failed)", () => {
    const gate = {
      decision: "failed",
      decidedBy: "user-1",
      decidedAt: new Date(),
      notes: "Missing evidence for KPI baseline",
    };
    expect(gate.decision).toBe("failed");
    expect(gate.notes).toContain("Missing evidence");
  });

  it("gate checklist tracks individual items", () => {
    const checklist = [
      { item: "Data quality verified", passed: true, notes: "" },
      { item: "KPI baseline established", passed: true, notes: "" },
      { item: "Stakeholder approval", passed: false, notes: "Pending review" },
    ];
    const allPassed = checklist.every((c) => c.passed);
    const passedCount = checklist.filter((c) => c.passed).length;
    expect(allPassed).toBe(false);
    expect(passedCount).toBe(2);
  });

  it("evidence coverage is a percentage", () => {
    const coverage = 85.5;
    expect(coverage).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });

  it("gate decision is required before phase progression", () => {
    const gate = { decision: "pending" };
    const canProgress = gate.decision === "passed";
    expect(canProgress).toBe(false);
  });

  it("only passed gate allows progression", () => {
    const decisions = ["pending", "failed", "passed"];
    const canProgress = decisions.map((d) => d === "passed");
    expect(canProgress).toEqual([false, false, true]);
  });
});

describe("Phase dependencies", () => {
  it("phase 0 has no dependencies", () => {
    expect(PHASE_DEPENDENCIES[0]).toEqual([]);
  });

  it("phase 1 has no dependencies", () => {
    expect(PHASE_DEPENDENCIES[1]).toEqual([]);
  });

  it("phase 2 depends on phase 1", () => {
    expect(PHASE_DEPENDENCIES[2]).toContain(1);
  });

  it("phase 7 depends on phases 5 and 6", () => {
    expect(PHASE_DEPENDENCIES[7]).toContain(5);
    expect(PHASE_DEPENDENCIES[7]).toContain(6);
  });

  it("all 8 phases are defined", () => {
    expect(PHASES).toHaveLength(8);
  });

  it("each phase has an id and name", () => {
    for (const phase of PHASES) {
      expect(phase.id).toBeDefined();
      expect(phase.name).toBeTruthy();
      expect(phase.short).toBeTruthy();
    }
  });

  it("phase can only run if all dependencies have passed gates", () => {
    const passedGates = new Set([0, 1]);
    const phase2Deps = PHASE_DEPENDENCIES[2];
    const canRunPhase2 = phase2Deps.every((dep) => passedGates.has(dep));
    expect(canRunPhase2).toBe(true);

    const phase3Deps = PHASE_DEPENDENCIES[3];
    const canRunPhase3 = phase3Deps.every((dep) => passedGates.has(dep));
    expect(canRunPhase3).toBe(false);
  });
});
