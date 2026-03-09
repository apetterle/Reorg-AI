import { storage } from "../../../storage";
import { logger } from "../../../logger";
import { callAIJson } from "../../../ai/client";
import { PHASE_SYSTEM_PROMPTS, buildPhaseContext } from "../../../ai/prompts";
import type { Fact, Artifact } from "@shared/schema";

export async function runPhase3(
  projectId: string,
  tenantId: string,
  facts: Fact[],
  priorArtifacts: Artifact[],
  projectInfo: { name: string; companyName?: string; industry?: string; language?: string },
): Promise<Artifact> {
  const systemPrompt = PHASE_SYSTEM_PROMPTS[3];
  const userPrompt = buildPhaseContext(facts, priorArtifacts, projectInfo);

  let aiOutput: any;
  try {
    aiOutput = await callAIJson(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 6000,
    });
  } catch (err: any) {
    logger.warn("Phase 3 AI call failed, creating fallback artifact", {
      source: "phase3",
      error: err.message,
    });
    aiOutput = {
      executiveSummary: "AI narrative generation failed. Review approved facts for manual analysis.",
      currentTechAssessment: "",
      recommendedStack: { dataLayer: [], intelligenceLayer: [], applicationLayer: [], experienceLayer: [] },
      buildBuyPartnerMatrix: [],
      integrationArchitecture: "",
      implementationRoadmap: { wave1_quickWins: { weeks: "0-8", items: [] }, wave2_scale: { weeks: "8-16", items: [] }, wave3_optimization: { weeks: "16-24", items: [] } },
      securityAndCompliance: [],
      caveats: ["AI narrative could not be generated — manual review required."],
    };
  }

  const artifact = await storage.createOrVersionArtifact({
    projectId,
    tenantId,
    type: "smartstack",
    phaseId: 3,
    schemaVersion: "1.0",
    language: projectInfo.language || "pt-BR",
    dataJson: {
      version: "smartstack_v1",
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
