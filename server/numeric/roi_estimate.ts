export interface RoiInvestment {
  category: string;
  amount: number;
  currency: string;
  timing: "upfront" | "year1" | "year2" | "year3";
}

export interface RoiCategoryBreakdown {
  category: string;
  investment: number;
  proportionalSavings: number;
}

export interface RoiEstimateOutput {
  totalInvestment: number;
  annualSavings: number;
  netPresentValue: number;
  paybackMonths: number;
  roiPercent: number;
  threeYearReturn: number;
  breakdownByCategory: RoiCategoryBreakdown[];
  version: string;
  computedAt: string;
}

const TIMING_YEAR_MAP: Record<string, number> = {
  upfront: 0,
  year1: 1,
  year2: 2,
  year3: 3,
};

export function computeRoiEstimate(
  investments: RoiInvestment[],
  annualSavings: number,
  discountRate: number = 0.10
): RoiEstimateOutput {
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);

  let paybackMonths: number;
  let roiPercent: number;
  let threeYearReturn: number;

  if (annualSavings <= 0) {
    paybackMonths = Infinity;
    roiPercent = -100;
    threeYearReturn = -totalInvestment;
  } else {
    const monthlySavings = annualSavings / 12;
    paybackMonths = totalInvestment / monthlySavings;
    threeYearReturn = annualSavings * 3 - totalInvestment;
    roiPercent = totalInvestment > 0
      ? ((annualSavings * 3 - totalInvestment) / totalInvestment) * 100
      : 0;
  }

  let npv = 0;
  for (const inv of investments) {
    const year = TIMING_YEAR_MAP[inv.timing] ?? 0;
    npv -= inv.amount / Math.pow(1 + discountRate, year);
  }
  for (let year = 1; year <= 3; year++) {
    npv += annualSavings / Math.pow(1 + discountRate, year);
  }

  const categoryTotals: Record<string, number> = {};
  for (const inv of investments) {
    categoryTotals[inv.category] = (categoryTotals[inv.category] || 0) + inv.amount;
  }

  const breakdownByCategory: RoiCategoryBreakdown[] = [];
  for (const category of Object.keys(categoryTotals)) {
    const investment = categoryTotals[category];
    const proportion = totalInvestment > 0 ? investment / totalInvestment : 0;
    breakdownByCategory.push({
      category,
      investment,
      proportionalSavings: annualSavings * 3 * proportion,
    });
  }

  return {
    totalInvestment,
    annualSavings,
    netPresentValue: Math.round(npv * 100) / 100,
    paybackMonths: Math.round(paybackMonths * 100) / 100,
    roiPercent: Math.round(roiPercent * 100) / 100,
    threeYearReturn: Math.round(threeYearReturn * 100) / 100,
    breakdownByCategory,
    version: "v1",
    computedAt: new Date().toISOString(),
  };
}
