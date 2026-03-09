import { storage } from "../../storage";
import { logger } from "../../logger";
import { step } from "../worker";
import type { Job } from "@shared/schema";
import { computeBaselineKpis } from "../../numeric/baseline_kpis";
import { computeOpportunitySizing, type OpportunitySizingAssumption } from "../../numeric/opportunity_sizing";
import { computeRoiEstimate, type RoiInvestment } from "../../numeric/roi_estimate";
import { computeConfidenceWeighting } from "../../numeric/confidence_weighting";
import { callAIJson } from "../../ai/client";
import { PHASE_SYSTEM_PROMPTS, summarizeFacts } from "../../ai/prompts";

export async function processValueScope(job: Job): Promise<void> {
  const { projectId, tenantId } = job;
  const inputJson = job.inputJson as any;
  const language = inputJson?.language || "pt-BR";
  const assumptions: OpportunitySizingAssumption[] = inputJson?.assumptions || [];
  const investments: RoiInvestment[] = inputJson?.investments || [];
  const discountRate: number = inputJson?.discountRate ?? 0.10;

  const approvedFacts = await step(job.id, "fetch_approved_facts", async () => {
    const facts = await storage.getFactsForProject(projectId, { status: "approved" });
    if (facts.length === 0) {
      throw new Error("No approved facts to compute ValueScope");
    }
    return facts;
  });

  const evidenceCounts: Record<string, number> = {};
  await step(job.id, "count_evidence", async () => {
    for (const fact of approvedFacts) {
      const ev = await storage.getEvidenceForFact(fact.id);
      evidenceCounts[fact.id] = ev.length;
    }
    return { totalFacts: approvedFacts.length };
  });

  const baselineResult = await step(job.id, "compute_baseline_kpis", async () => {
    return computeBaselineKpis(approvedFacts, evidenceCounts);
  });

  const confidenceResult = await step(job.id, "compute_confidence_weighting", async () => {
    const factInputs = approvedFacts.map((f) => ({
      confidence: f.confidence || 0,
      evidenceCount: evidenceCounts[f.id] || 0,
    }));
    return computeConfidenceWeighting(factInputs);
  });

  let opportunityResult = null;
  if (assumptions.length > 0) {
    opportunityResult = await step(job.id, "compute_opportunity_sizing", async () => {
      return computeOpportunitySizing(baselineResult.kpis, assumptions);
    });
  }

  let roiResult = null;
  if (investments.length > 0 && opportunityResult) {
    roiResult = await step(job.id, "compute_roi_estimate", async () => {
      const annualSavings = opportunityResult!.totalMid;
      return computeRoiEstimate(investments, annualSavings, discountRate);
    });
  }

  let narrative: any = null;
  await step(job.id, "generate_narrative", async () => {
    try {
      const numericBlockOutputs: Record<string, any> = {
        baseline_kpis: baselineResult,
        confidence_weighting: confidenceResult,
      };
      if (opportunityResult) numericBlockOutputs.opportunity_sizing = opportunityResult;
      if (roiResult) numericBlockOutputs.roi_estimate = roiResult;

      const userPrompt = [
        `## Approved Facts (${approvedFacts.length} total)`,
        summarizeFacts(approvedFacts),
        "",
        `## Numeric Block Outputs`,
        JSON.stringify(numericBlockOutputs, null, 2),
        "",
        `## Output Language: ${language}`,
      ].join("\n");

      narrative = await callAIJson(PHASE_SYSTEM_PROMPTS[1], userPrompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });
      return { narrativeGenerated: true };
    } catch (err: any) {
      logger.warn("ValueScope narrative generation failed, proceeding without", {
        source: "valuescope",
        error: err.message,
      });
      return { narrativeGenerated: false, error: err.message };
    }
  });

  const artifactResult = await step(job.id, "create_artifact", async () => {
    const textualFacts = approvedFacts.filter((f) => f.factType === "textual");
    const claims = textualFacts.map((f) => ({
      key: f.key,
      value: f.valueJson,
      confidence: f.confidence,
    }));

    const valueScopeData: Record<string, any> = {
      version: "valuescope_v1",
      language,
      generatedAt: new Date().toISOString(),
      summary: {
        totalApprovedFacts: approvedFacts.length,
        kpiCount: baselineResult.kpis.length,
        textualFactCount: textualFacts.length,
        averageConfidence: confidenceResult.averageConfidence,
        confidenceRecommendation: confidenceResult.recommendation,
        weightedScore: confidenceResult.weightedScore,
      },
      baselineKpis: baselineResult,
      confidenceWeighting: confidenceResult,
      claims,
      lineage: {
        inputFactIds: approvedFacts.map((f) => f.id),
        blocksUsed: ["baseline_kpis_v1", "confidence_weighting_v1"],
      },
    };

    if (opportunityResult) {
      valueScopeData.opportunitySizing = opportunityResult;
      valueScopeData.lineage.blocksUsed.push("opportunity_sizing_v1");
    }

    if (roiResult) {
      valueScopeData.roiEstimate = roiResult;
      valueScopeData.lineage.blocksUsed.push("roi_estimate_v1");
    }

    if (narrative) {
      valueScopeData.narrative = narrative;
      valueScopeData.lineage.blocksUsed.push("ai_narrative_v1");
    }

    const artifact = await storage.createOrVersionArtifact({
      projectId,
      tenantId,
      type: "valuescope",
      phaseId: 1,
      schemaVersion: "1.0",
      language,
      dataJson: valueScopeData,
    });

    return { artifactId: artifact.id };
  });

  await storage.updateJob(job.id, { resultJson: artifactResult });
  logger.info("ValueScope job completed", { source: "jobs", jobId: job.id, ...artifactResult });
  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, artifactResult, projectId);
}
