import { storage } from "../../../storage";
import { logger } from "../../../logger";
import { callAIJson } from "../../../ai/client";
import { PHASE_SYSTEM_PROMPTS, buildPhaseContext } from "../../../ai/prompts";
import type { Fact, Artifact } from "@shared/schema";

export async function runPhase5(
  projectId: string,
  tenantId: string,
  facts: Fact[],
  priorArtifacts: Artifact[],
  projectInfo: { name: string; companyName?: string; industry?: string; language?: string },
): Promise<Artifact> {
  const systemPrompt = PHASE_SYSTEM_PROMPTS[5];
  const userPrompt = buildPhaseContext(facts, priorArtifacts, projectInfo);

  let aiOutput: any;
  try {
    aiOutput = await callAIJson(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 6000,
    });
  } catch (err: any) {
    logger.warn("Phase 5 AI call failed, creating fallback artifact", {
      source: "phase5",
      error: err.message,
    });
    aiOutput = {
      executiveSummary: "AI narrative generation failed. Review approved facts for manual analysis.",
      currentStateAnalysis: "",
      targetOperatingModel: { designPrinciples: [], orgStructure: "", keyChanges: [] },
      newRoles: [],
      raciMatrix: [],
      spanOfControlAnalysis: "",
      transitionPlan: { phase1_foundation: { weeks: "0-8", actions: [] }, phase2_migration: { weeks: "8-16", actions: [] }, phase3_optimization: { weeks: "16-24", actions: [] } },
      upskilling: [],
      caveats: ["AI narrative could not be generated — manual review required."],
    };
  }

  const artifact = await storage.createOrVersionArtifact({
    projectId,
    tenantId,
    type: "orgdna",
    phaseId: 5,
    schemaVersion: "1.0",
    language: projectInfo.language || "pt-BR",
    dataJson: {
      version: "orgdna_v1",
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
