import { storage } from "../../../storage";
import { logger } from "../../../logger";
import { callAIJson } from "../../../ai/client";
import { PHASE_SYSTEM_PROMPTS, buildPhaseContext } from "../../../ai/prompts";
import type { Fact, Artifact } from "@shared/schema";

export async function runPhase7(
  projectId: string,
  tenantId: string,
  facts: Fact[],
  priorArtifacts: Artifact[],
  projectInfo: { name: string; companyName?: string; industry?: string; language?: string },
): Promise<Artifact> {
  const systemPrompt = PHASE_SYSTEM_PROMPTS[7];
  const userPrompt = buildPhaseContext(facts, priorArtifacts, projectInfo);

  let aiOutput: any;
  try {
    aiOutput = await callAIJson(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 8000,
    });
  } catch (err: any) {
    logger.warn("Phase 7 AI call failed, creating fallback artifact", {
      source: "phase7",
      error: err.message,
    });
    aiOutput = {
      executiveSummary: "AI narrative generation failed. Review approved facts for manual analysis.",
      changeImpactAssessment: [],
      adoptionRoadmap: {
        wave1_quickWins: { weeks: "0-8", milestones: [], successMetrics: [] },
        wave2_scale: { weeks: "8-16", milestones: [], successMetrics: [] },
        wave3_optimization: { weeks: "16-24", milestones: [], successMetrics: [] },
      },
      communicationPlan: {
        board: { frequency: "", format: "", keyMessages: [] },
        managers: { frequency: "", format: "", keyMessages: [] },
        operators: { frequency: "", format: "", keyMessages: [] },
      },
      upskillingProgram: [],
      successMetrics: [],
      feedbackLoops: [],
      executivePresentationOutline: [],
      caveats: ["AI narrative could not be generated — manual review required."],
    };
  }

  const artifact = await storage.createOrVersionArtifact({
    projectId,
    tenantId,
    type: "adoptloop",
    phaseId: 7,
    schemaVersion: "1.0",
    language: projectInfo.language || "pt-BR",
    dataJson: {
      version: "adoptloop_v1",
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
