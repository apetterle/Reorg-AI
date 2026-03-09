export interface ConfidenceFactInput {
  confidence: number;
  evidenceCount: number;
}

export interface ConfidenceWeights {
  confidenceWeight: number;
  evidenceWeight: number;
}

export interface ConfidenceWeightingOutput {
  weightedScore: number;
  factCount: number;
  averageConfidence: number;
  averageEvidenceCount: number;
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
  recommendation: "sufficient" | "needs_more_data" | "insufficient";
  version: string;
  computedAt: string;
}

const DEFAULT_WEIGHTS: ConfidenceWeights = {
  confidenceWeight: 0.7,
  evidenceWeight: 0.3,
};

export function computeConfidenceWeighting(
  facts: ConfidenceFactInput[],
  weights?: Partial<ConfidenceWeights>
): ConfidenceWeightingOutput {
  const w: ConfidenceWeights = { ...DEFAULT_WEIGHTS, ...weights };

  if (facts.length === 0) {
    return {
      weightedScore: 0,
      factCount: 0,
      averageConfidence: 0,
      averageEvidenceCount: 0,
      distribution: { high: 0, medium: 0, low: 0 },
      recommendation: "insufficient",
      version: "v1",
      computedAt: new Date().toISOString(),
    };
  }

  let totalWeightedScore = 0;
  let totalConfidence = 0;
  let totalEvidence = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const fact of facts) {
    const normalizedEvidence = Math.min(fact.evidenceCount / 5, 1.0);
    const score = fact.confidence * w.confidenceWeight + normalizedEvidence * w.evidenceWeight;
    totalWeightedScore += score;
    totalConfidence += fact.confidence;
    totalEvidence += fact.evidenceCount;

    if (fact.confidence >= 0.8) high++;
    else if (fact.confidence >= 0.5) medium++;
    else low++;
  }

  const weightedScore = Math.round((totalWeightedScore / facts.length) * 1000) / 1000;
  const averageConfidence = Math.round((totalConfidence / facts.length) * 1000) / 1000;
  const averageEvidenceCount = Math.round((totalEvidence / facts.length) * 1000) / 1000;

  let recommendation: "sufficient" | "needs_more_data" | "insufficient";
  if (weightedScore >= 0.7) recommendation = "sufficient";
  else if (weightedScore >= 0.4) recommendation = "needs_more_data";
  else recommendation = "insufficient";

  return {
    weightedScore,
    factCount: facts.length,
    averageConfidence,
    averageEvidenceCount,
    distribution: { high, medium, low },
    recommendation,
    version: "v1",
    computedAt: new Date().toISOString(),
  };
}
