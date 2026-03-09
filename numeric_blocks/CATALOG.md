# ReOrg AI — Numeric Blocks Catalog

## Overview

Numeric blocks are deterministic computation modules that produce reproducible outputs from structured inputs. They are the only source of computed numbers in the platform — LLMs may narrate around these outputs but never introduce new numbers.

## Design Principles

1. **Deterministic**: Same inputs always produce same outputs.
2. **Traceable**: Every output value links to specific input facts or assumptions.
3. **Reproducible**: Computations can be independently verified.
4. **Versioned**: Each block has a version; outputs record the block version used.

## Block Catalog

### 1. baseline_kpis (v1)

**Purpose**: Normalize approved KPI facts into a consistent, comparable table format.

**Inputs**:
- `approvedFacts[]` — facts with `factType: "kpi"`, status `"approved"`
- Each fact must have: `key`, `valueJson.value`, `valueJson.unit`, `valueJson.period`

**Outputs**:
```json
{
  "kpis": [
    {
      "key": "string",
      "value": "number",
      "unit": "string",
      "period": "string",
      "sourceFactIds": ["uuid"],
      "evidenceCount": "number"
    }
  ],
  "version": "v1",
  "computedAt": "ISO 8601"
}
```

**Rules**:
- Deduplicate facts with same key by preferring higher confidence.
- Normalize units where possible (e.g., "R$" → "BRL", "k" → multiply by 1000).
- Include evidence count for each KPI.

---

### 2. opportunity_sizing (v1)

**Purpose**: Compute opportunity size ranges from baseline KPIs and analyst-provided assumptions.

**Inputs**:
- `baselineKpis[]` — output from `baseline_kpis` block
- `assumptions[]` — analyst-provided parameters:
  ```json
  {
    "area": "string (e.g., 'headcount_optimization')",
    "lowPercent": "number (conservative reduction %)",
    "highPercent": "number (aggressive reduction %)",
    "baselineKey": "string (key from baseline_kpis)"
  }
  ```

**Outputs**:
```json
{
  "opportunities": [
    {
      "area": "string",
      "baselineValue": "number",
      "baselineUnit": "string",
      "lowEstimate": "number",
      "highEstimate": "number",
      "midEstimate": "number",
      "assumptionUsed": "object",
      "sourceKpiKey": "string"
    }
  ],
  "totalLow": "number",
  "totalHigh": "number",
  "totalMid": "number",
  "currency": "string",
  "version": "v1",
  "computedAt": "ISO 8601"
}
```

**Rules**:
- `lowEstimate = baselineValue * lowPercent / 100`
- `highEstimate = baselineValue * highPercent / 100`
- `midEstimate = (lowEstimate + highEstimate) / 2`
- If `baselineKey` not found in KPIs, skip and add to warnings.
- Totals are sums across all opportunities.

---

### 3. roi_estimate (v1)

**Purpose**: Compute ROI and payback period from costs and savings inputs.

**Inputs**:
- `investments[]` — implementation costs:
  ```json
  {
    "category": "string",
    "amount": "number",
    "currency": "string",
    "timing": "upfront | year1 | year2 | year3"
  }
  ```
- `savings` — from `opportunity_sizing` output (use `midEstimate` by default)
- `annualSavings`: "number" — total annual recurring savings
- `discountRate`: "number" (default 0.10, 10%)

**Outputs**:
```json
{
  "totalInvestment": "number",
  "annualSavings": "number",
  "netPresentValue": "number",
  "paybackMonths": "number",
  "roiPercent": "number",
  "threeYearReturn": "number",
  "breakdownByCategory": [
    {
      "category": "string",
      "investment": "number",
      "proportionalSavings": "number"
    }
  ],
  "version": "v1",
  "computedAt": "ISO 8601"
}
```

**Rules**:
- `paybackMonths = totalInvestment / (annualSavings / 12)`
- `roiPercent = ((annualSavings * 3 - totalInvestment) / totalInvestment) * 100` (3-year horizon)
- NPV computed using provided discount rate over 3-year horizon.
- If `annualSavings` is zero, `paybackMonths` is `Infinity` and `roiPercent` is `-100`.

---

### 4. confidence_weighting (v1)

**Purpose**: Aggregate outputs weighted by fact confidence and evidence count to produce a reliability score.

**Inputs**:
- `facts[]` — approved facts with `confidence` (0.0–1.0) and `evidenceCount`
- `weights` — optional custom weights:
  ```json
  {
    "confidenceWeight": "number (default 0.7)",
    "evidenceWeight": "number (default 0.3)"
  }
  ```

**Outputs**:
```json
{
  "weightedScore": "number (0.0–1.0)",
  "factCount": "number",
  "averageConfidence": "number",
  "averageEvidenceCount": "number",
  "distribution": {
    "high": "number (facts with confidence >= 0.8)",
    "medium": "number (facts with confidence 0.5–0.79)",
    "low": "number (facts with confidence < 0.5)"
  },
  "recommendation": "string ('sufficient' | 'needs_more_data' | 'insufficient')",
  "version": "v1",
  "computedAt": "ISO 8601"
}
```

**Rules**:
- `weightedScore = avg(confidence * confidenceWeight + normalizedEvidenceCount * evidenceWeight)`
- `normalizedEvidenceCount = min(evidenceCount / 5, 1.0)` — caps at 5 evidence items.
- Recommendation thresholds: >= 0.7 "sufficient", 0.4–0.69 "needs_more_data", < 0.4 "insufficient".
- If no facts provided, return `weightedScore: 0`, recommendation: "insufficient".
