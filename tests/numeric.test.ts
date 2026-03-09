import { describe, it, expect } from "vitest";
import { computeBaselineKpis } from "../server/numeric/baseline_kpis";
import { computeOpportunitySizing } from "../server/numeric/opportunity_sizing";
import { computeRoiEstimate } from "../server/numeric/roi_estimate";
import { computeConfidenceWeighting } from "../server/numeric/confidence_weighting";
import type { Fact } from "@shared/schema";

function makeFact(overrides: Partial<Fact> & { id: string; key: string; valueJson: unknown }): Fact {
  return {
    projectId: "proj-1",
    tenantId: "tenant-1",
    factType: "kpi",
    status: "approved",
    unit: null,
    confidence: 0.8,
    derivedFromJobId: null,
    phaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Fact;
}

describe("baseline_kpis", () => {
  it("produces deterministic output for same inputs", () => {
    const facts = [
      makeFact({ id: "f1", key: "revenue", valueJson: { value: 1000, unit: "BRL", period: "annual" } }),
      makeFact({ id: "f2", key: "headcount", valueJson: { value: 50, unit: "people", period: "annual" } }),
    ];
    const ev = { f1: 3, f2: 1 };

    const r1 = computeBaselineKpis(facts, ev);
    const r2 = computeBaselineKpis(facts, ev);

    expect(r1.kpis).toEqual(r2.kpis);
    expect(r1.version).toBe("v1");
    expect(r1.kpis).toHaveLength(2);
  });

  it("deduplicates by key preferring higher confidence", () => {
    const facts = [
      makeFact({ id: "f1", key: "revenue", valueJson: { value: 1000, unit: "BRL" }, confidence: 0.6 }),
      makeFact({ id: "f2", key: "revenue", valueJson: { value: 1200, unit: "BRL" }, confidence: 0.9 }),
    ];
    const ev = { f1: 1, f2: 2 };

    const result = computeBaselineKpis(facts, ev);
    expect(result.kpis).toHaveLength(1);
    expect(result.kpis[0].value).toBe(1200);
    expect(result.kpis[0].sourceFactIds).toContain("f1");
    expect(result.kpis[0].sourceFactIds).toContain("f2");
  });

  it("normalizes R$ to BRL", () => {
    const facts = [
      makeFact({ id: "f1", key: "cost", valueJson: { value: 500, unit: "R$", period: "monthly" } }),
    ];
    const result = computeBaselineKpis(facts, { f1: 1 });
    expect(result.kpis[0].unit).toBe("BRL");
  });

  it("handles empty approved facts", () => {
    const result = computeBaselineKpis([], {});
    expect(result.kpis).toHaveLength(0);
    expect(result.version).toBe("v1");
  });
});

describe("opportunity_sizing", () => {
  it("computes estimates correctly", () => {
    const kpis = [
      { key: "revenue", value: 10000, unit: "BRL", period: "annual", sourceFactIds: ["f1"], evidenceCount: 2 },
    ];
    const assumptions = [
      { area: "cost_reduction", lowPercent: 5, highPercent: 15, baselineKey: "revenue" },
    ];

    const result = computeOpportunitySizing(kpis, assumptions);

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].lowEstimate).toBe(500);
    expect(result.opportunities[0].highEstimate).toBe(1500);
    expect(result.opportunities[0].midEstimate).toBe(1000);
    expect(result.totalLow).toBe(500);
    expect(result.totalHigh).toBe(1500);
    expect(result.totalMid).toBe(1000);
    expect(result.version).toBe("v1");
  });

  it("skips missing baseline keys and adds warning", () => {
    const kpis = [
      { key: "revenue", value: 10000, unit: "BRL", period: "annual", sourceFactIds: ["f1"], evidenceCount: 2 },
    ];
    const assumptions = [
      { area: "missing_area", lowPercent: 5, highPercent: 15, baselineKey: "nonexistent" },
    ];

    const result = computeOpportunitySizing(kpis, assumptions);
    expect(result.opportunities).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("nonexistent");
  });

  it("is deterministic", () => {
    const kpis = [
      { key: "rev", value: 5000, unit: "USD", period: "annual", sourceFactIds: ["f1"], evidenceCount: 1 },
    ];
    const assumptions = [
      { area: "a", lowPercent: 10, highPercent: 20, baselineKey: "rev" },
    ];

    const r1 = computeOpportunitySizing(kpis, assumptions);
    const r2 = computeOpportunitySizing(kpis, assumptions);
    expect(r1.opportunities).toEqual(r2.opportunities);
    expect(r1.totalMid).toEqual(r2.totalMid);
  });
});

describe("roi_estimate", () => {
  it("computes ROI and payback correctly", () => {
    const investments = [
      { category: "tech", amount: 100000, currency: "BRL", timing: "upfront" as const },
    ];

    const result = computeRoiEstimate(investments, 50000, 0.10);

    expect(result.totalInvestment).toBe(100000);
    expect(result.annualSavings).toBe(50000);
    expect(result.paybackMonths).toBe(24);
    expect(result.roiPercent).toBe(50);
    expect(result.threeYearReturn).toBe(50000);
    expect(result.version).toBe("v1");
  });

  it("handles zero savings", () => {
    const investments = [
      { category: "tech", amount: 100000, currency: "BRL", timing: "upfront" as const },
    ];

    const result = computeRoiEstimate(investments, 0);
    expect(result.paybackMonths).toBe(Infinity);
    expect(result.roiPercent).toBe(-100);
  });

  it("computes NPV with discount rate", () => {
    const investments = [
      { category: "tech", amount: 100000, currency: "BRL", timing: "upfront" as const },
    ];
    const result = computeRoiEstimate(investments, 50000, 0.10);
    expect(result.netPresentValue).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const investments = [
      { category: "tech", amount: 50000, currency: "BRL", timing: "year1" as const },
    ];
    const r1 = computeRoiEstimate(investments, 30000);
    const r2 = computeRoiEstimate(investments, 30000);
    expect(r1.totalInvestment).toEqual(r2.totalInvestment);
    expect(r1.roiPercent).toEqual(r2.roiPercent);
    expect(r1.paybackMonths).toEqual(r2.paybackMonths);
    expect(r1.netPresentValue).toEqual(r2.netPresentValue);
  });
});

describe("confidence_weighting", () => {
  it("returns insufficient for empty facts", () => {
    const result = computeConfidenceWeighting([]);
    expect(result.weightedScore).toBe(0);
    expect(result.recommendation).toBe("insufficient");
    expect(result.factCount).toBe(0);
  });

  it("computes weighted score correctly", () => {
    const facts = [
      { confidence: 0.9, evidenceCount: 5 },
      { confidence: 0.7, evidenceCount: 3 },
    ];
    const result = computeConfidenceWeighting(facts);

    expect(result.factCount).toBe(2);
    expect(result.averageConfidence).toBeCloseTo(0.8, 1);
    expect(result.weightedScore).toBeGreaterThan(0);
    expect(result.distribution.high).toBe(1);
    expect(result.distribution.medium).toBe(1);
    expect(result.distribution.low).toBe(0);
  });

  it("caps evidence count at 5", () => {
    const facts = [
      { confidence: 0.5, evidenceCount: 100 },
    ];
    const result = computeConfidenceWeighting(facts);
    const expected = 0.5 * 0.7 + 1.0 * 0.3;
    expect(result.weightedScore).toBeCloseTo(expected, 2);
  });

  it("recommends sufficient for high scores", () => {
    const facts = [
      { confidence: 0.95, evidenceCount: 5 },
      { confidence: 0.9, evidenceCount: 4 },
    ];
    const result = computeConfidenceWeighting(facts);
    expect(result.recommendation).toBe("sufficient");
  });

  it("recommends needs_more_data for medium scores", () => {
    const facts = [
      { confidence: 0.5, evidenceCount: 1 },
      { confidence: 0.6, evidenceCount: 1 },
    ];
    const result = computeConfidenceWeighting(facts);
    expect(result.recommendation).toBe("needs_more_data");
  });

  it("is deterministic", () => {
    const facts = [
      { confidence: 0.8, evidenceCount: 3 },
      { confidence: 0.6, evidenceCount: 2 },
    ];
    const r1 = computeConfidenceWeighting(facts);
    const r2 = computeConfidenceWeighting(facts);
    expect(r1.weightedScore).toEqual(r2.weightedScore);
    expect(r1.recommendation).toEqual(r2.recommendation);
  });
});
