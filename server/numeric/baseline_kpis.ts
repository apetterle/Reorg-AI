import type { Fact } from "@shared/schema";

export interface BaselineKpi {
  key: string;
  value: number;
  unit: string;
  period: string;
  sourceFactIds: string[];
  evidenceCount: number;
}

export interface BaselineKpisOutput {
  kpis: BaselineKpi[];
  version: string;
  computedAt: string;
}

const UNIT_NORMALIZATION: Record<string, string> = {
  "R$": "BRL",
  "r$": "BRL",
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
};

const MULTIPLIER_SUFFIXES: Record<string, number> = {
  k: 1_000,
  K: 1_000,
  M: 1_000_000,
  MM: 1_000_000,
  mil: 1_000_000,
  million: 1_000_000,
  bi: 1_000_000_000,
  billion: 1_000_000_000,
  B: 1_000_000_000,
};

function normalizeUnit(raw: string): string {
  return UNIT_NORMALIZATION[raw] || raw;
}

function normalizeValue(rawValue: number, unit: string): { value: number; unit: string } {
  for (const [suffix, multiplier] of Object.entries(MULTIPLIER_SUFFIXES)) {
    if (unit.toLowerCase() === suffix.toLowerCase()) {
      return { value: rawValue * multiplier, unit: "" };
    }
  }
  return { value: rawValue, unit: normalizeUnit(unit) };
}

export function computeBaselineKpis(
  approvedFacts: Fact[],
  evidenceCounts: Record<string, number>
): BaselineKpisOutput {
  const kpiFacts = approvedFacts.filter((f) => f.factType === "kpi");

  const grouped: Record<string, Fact[]> = {};
  for (const fact of kpiFacts) {
    if (!grouped[fact.key]) grouped[fact.key] = [];
    grouped[fact.key].push(fact);
  }

  const kpis: BaselineKpi[] = [];

  for (const key of Object.keys(grouped)) {
    const groupFacts = grouped[key];
    const best = groupFacts.reduce((a: Fact, b: Fact) => ((a.confidence || 0) >= (b.confidence || 0) ? a : b));
    const vj = best.valueJson as any;
    const rawValue = typeof vj?.value === "number" ? vj.value : parseFloat(vj?.value) || 0;
    const rawUnit = String(vj?.unit || best.unit || "");
    const period = String(vj?.period || "annual");

    const normalized = normalizeValue(rawValue, rawUnit);

    kpis.push({
      key,
      value: normalized.value,
      unit: normalized.unit || rawUnit,
      period,
      sourceFactIds: groupFacts.map((f: Fact) => f.id),
      evidenceCount: groupFacts.reduce((sum: number, f: Fact) => sum + (evidenceCounts[f.id] || 0), 0),
    });
  }

  return {
    kpis,
    version: "v1",
    computedAt: new Date().toISOString(),
  };
}
