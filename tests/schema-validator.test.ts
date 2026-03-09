import { describe, it, expect } from "vitest";
import { validateArtifact, listAvailableSchemas } from "../server/schemas/validator";

describe("validateArtifact - valuescope_report_v1", () => {
  const validReport = {
    executive_summary: {
      context: "Analysis of operations for cost optimization",
      key_findings: [
        {
          claim_id: "c1",
          text: "High AHT in customer service",
          severity: "high",
          evidence: { evidence_ids: ["ev-1", "ev-2"] },
        },
      ],
      top_opportunities: [
        {
          opp_id: "opp-1",
          title: "Reduce AHT",
          summary: "Automate tier-1 support",
          estimated_value: { amount: 500000, currency: "BRL", period: "annual" },
          confidence: 0.8,
          evidence: { evidence_ids: ["ev-1"] },
        },
      ],
      assumptions: [
        {
          assumption_id: "a1",
          text: "Current AHT is 12 minutes",
          owner: "analyst",
          status: "proposed",
        },
      ],
    },
    kpi_tree: { root: "cost_per_transaction" },
    baseline: { metrics: {} },
    opportunities: [
      {
        opp_id: "opp-1",
        title: "Reduce AHT",
        summary: "Automate tier-1 support",
        estimated_value: { amount: 500000, currency: "BRL", period: "annual" },
        confidence: 0.8,
        evidence: { evidence_ids: ["ev-1"] },
      },
    ],
    risks: [
      {
        risk_id: "r1",
        title: "Adoption resistance",
        impact: "medium",
        likelihood: "high",
        mitigation: "Change management program",
      },
    ],
    appendix: {},
  };

  it("validates a correct valuescope report", () => {
    const result = validateArtifact("valuescope_report_v1", validReport);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects report missing executive_summary", () => {
    const { executive_summary, ...incomplete } = validReport;
    const result = validateArtifact("valuescope_report_v1", incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("executive_summary"))).toBe(true);
  });

  it("rejects report missing required top-level fields", () => {
    const result = validateArtifact("valuescope_report_v1", {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects report with invalid severity enum", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.executive_summary.key_findings[0].severity = "critical";
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("severity"))).toBe(true);
  });

  it("rejects report with invalid risk impact enum", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.risks[0].impact = "catastrophic";
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects opportunity with confidence > 1", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.opportunities[0].confidence = 1.5;
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects opportunity with confidence < 0", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.opportunities[0].confidence = -0.1;
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects opportunity missing estimated_value fields", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.opportunities[0].estimated_value = { amount: 100 };
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects assumption with invalid status enum", () => {
    const bad = JSON.parse(JSON.stringify(validReport));
    bad.executive_summary.assumptions[0].status = "maybe";
    const result = validateArtifact("valuescope_report_v1", bad);
    expect(result.valid).toBe(false);
  });
});

describe("validateArtifact - business_case_report_v1", () => {
  const validBusinessCase = {
    executive_summary: { overview: "Business case for automation" },
    assumptions: [{ text: "10% efficiency gain", impact: "high" }],
    financials: {
      npv: 1200000,
      irr: 0.25,
      payback_months: 18,
      roi_by_year: [
        { year: 1, roi: 0.15 },
        { year: 2, roi: 0.35 },
        { year: 3, roi: 0.55 },
      ],
    },
    scenarios: [{ name: "base", description: "Base case scenario" }],
    risks: [{ title: "Delay", probability: "medium" }],
    recommendation: "Proceed with Phase 1 implementation",
  };

  it("validates a correct business case report", () => {
    const result = validateArtifact("business_case_report_v1", validBusinessCase);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects business case missing financials", () => {
    const { financials, ...incomplete } = validBusinessCase;
    const result = validateArtifact("business_case_report_v1", incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("financials"))).toBe(true);
  });

  it("rejects business case missing recommendation", () => {
    const { recommendation, ...incomplete } = validBusinessCase;
    const result = validateArtifact("business_case_report_v1", incomplete);
    expect(result.valid).toBe(false);
  });

  it("rejects business case with invalid financials (missing npv)", () => {
    const bad = JSON.parse(JSON.stringify(validBusinessCase));
    delete bad.financials.npv;
    const result = validateArtifact("business_case_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects business case with invalid roi_by_year entry", () => {
    const bad = JSON.parse(JSON.stringify(validBusinessCase));
    bad.financials.roi_by_year = [{ year: "not-a-number", roi: 0.15 }];
    const result = validateArtifact("business_case_report_v1", bad);
    expect(result.valid).toBe(false);
  });

  it("rejects empty object as business case", () => {
    const result = validateArtifact("business_case_report_v1", {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateArtifact - unknown schema", () => {
  it("returns valid for unknown schema type (no schema to validate against)", () => {
    const result = validateArtifact("nonexistent_schema_v99", { any: "data" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("listAvailableSchemas", () => {
  it("lists available schema files", () => {
    const schemas = listAvailableSchemas();
    expect(schemas).toContain("valuescope_report_v1");
    expect(schemas).toContain("business_case_report_v1");
  });

  it("returns an array", () => {
    const schemas = listAvailableSchemas();
    expect(Array.isArray(schemas)).toBe(true);
  });
});
