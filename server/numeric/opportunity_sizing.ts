import type { BaselineKpi } from "./baseline_kpis";

export interface OpportunitySizingAssumption {
  area: string;
  lowPercent: number;
  highPercent: number;
  baselineKey: string;
}

export interface OpportunitySizingEntry {
  area: string;
  baselineValue: number;
  baselineUnit: string;
  lowEstimate: number;
  highEstimate: number;
  midEstimate: number;
  assumptionUsed: OpportunitySizingAssumption;
  sourceKpiKey: string;
}

export interface OpportunitySizingOutput {
  opportunities: OpportunitySizingEntry[];
  totalLow: number;
  totalHigh: number;
  totalMid: number;
  currency: string;
  warnings: string[];
  version: string;
  computedAt: string;
}

export function computeOpportunitySizing(
  baselineKpis: BaselineKpi[],
  assumptions: OpportunitySizingAssumption[]
): OpportunitySizingOutput {
  const kpiMap = new Map<string, BaselineKpi>();
  for (const kpi of baselineKpis) {
    kpiMap.set(kpi.key, kpi);
  }

  const opportunities: OpportunitySizingEntry[] = [];
  const warnings: string[] = [];
  let currency = "BRL";

  for (const assumption of assumptions) {
    const kpi = kpiMap.get(assumption.baselineKey);
    if (!kpi) {
      warnings.push(`Baseline key "${assumption.baselineKey}" not found in KPIs — skipped.`);
      continue;
    }

    if (kpi.unit && ["BRL", "USD", "EUR", "GBP"].includes(kpi.unit)) {
      currency = kpi.unit;
    }

    const lowEstimate = kpi.value * assumption.lowPercent / 100;
    const highEstimate = kpi.value * assumption.highPercent / 100;
    const midEstimate = (lowEstimate + highEstimate) / 2;

    opportunities.push({
      area: assumption.area,
      baselineValue: kpi.value,
      baselineUnit: kpi.unit,
      lowEstimate,
      highEstimate,
      midEstimate,
      assumptionUsed: assumption,
      sourceKpiKey: kpi.key,
    });
  }

  return {
    opportunities,
    totalLow: opportunities.reduce((sum, o) => sum + o.lowEstimate, 0),
    totalHigh: opportunities.reduce((sum, o) => sum + o.highEstimate, 0),
    totalMid: opportunities.reduce((sum, o) => sum + o.midEstimate, 0),
    currency,
    warnings,
    version: "v1",
    computedAt: new Date().toISOString(),
  };
}
