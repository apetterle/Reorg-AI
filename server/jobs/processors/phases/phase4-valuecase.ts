import { storage } from "../../../storage";
import { logger } from "../../../logger";
import { callAIJson } from "../../../ai/client";
import { PHASE_SYSTEM_PROMPTS, buildPhaseContext } from "../../../ai/prompts";
import type { Fact, Artifact } from "@shared/schema";

export async function runPhase4(
  projectId: string,
  tenantId: string,
  facts: Fact[],
  priorArtifacts: Artifact[],
  projectInfo: { name: string; companyName?: string; industry?: string; language?: string },
): Promise<Artifact> {
  const systemPrompt = PHASE_SYSTEM_PROMPTS[4];
  const userPrompt = buildPhaseContext(facts, priorArtifacts, projectInfo);

  let aiOutput: any;
  try {
    aiOutput = await callAIJson(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 6000,
    });
  } catch (err: any) {
    logger.warn("Phase 4 AI call failed, creating fallback artifact", {
      source: "phase4",
      error: err.message,
    });
    aiOutput = {
      executiveSummary: "AI narrative generation failed. Review approved facts for manual analysis.",
      investmentSummary: { totalInvestment: "N/A", categories: [] },
      scenarioModels: {
        conservative: { assumptions: [], annualSavings: "N/A", paybackMonths: "N/A", roi5Year: "N/A" },
        base: { assumptions: [], annualSavings: "N/A", paybackMonths: "N/A", roi5Year: "N/A" },
        optimistic: { assumptions: [], annualSavings: "N/A", paybackMonths: "N/A", roi5Year: "N/A" },
      },
      financialProjection60Month: "",
      sensitivityAnalysis: [],
      riskFactors: [],
      recommendations: [],
      caveats: ["AI narrative could not be generated — manual review required."],
    };
  }

  const artifact = await storage.createOrVersionArtifact({
    projectId,
    tenantId,
    type: "valuecase",
    phaseId: 4,
    schemaVersion: "1.0",
    language: projectInfo.language || "pt-BR",
    dataJson: {
      version: "valuecase_v1",
      generatedAt: new Date().toISOString(),
      ...aiOutput,
      lineage: {
        inputFactIds: facts.map((f) => f.id),
        priorArtifactIds: priorArtifacts.map((a) => a.id),
      },
    },
  });

  return artifact;
}
