# Phase Scope Matrix

## Phase Dependencies

| Phase | Name | Depends On | Unlocks |
|---|---|---|---|
| 0 | Setup Baseline | — | Phase 1 |
| 1 | ValueScope | Phase 0 | Phase 2 |
| 2 | ZeroBase Rebuild | Phase 1 | Phase 3, Phase 4 |
| 3 | SmartStack | Phase 2 | Phase 4 |
| 4 | ValueCase | Phase 2, Phase 3 | Phase 5 |
| 5 | OrgDNA | Phase 2, Phase 3, Phase 4 | Phase 6, Phase 7 |
| 6 | AIPolicyCore | Phases 1-5 | Phase 7 |
| 7 | AdoptLoop | Phase 5, Phase 6 | — |

## Phase Artifacts

| Phase | Artifact Type | Key |
|---|---|---|
| 0 | baseline_inventory | `baseline_inventory_v1` |
| 1 | valuescope | `valuescope_v1` |
| 2 | zerobase | `zerobase_v1` |
| 3 | smartstack | `smartstack_v1` |
| 4 | valuecase | `valuecase_v1` |
| 5 | orgdna | `orgdna_v1` |
| 6 | aipolicycore | `aipolicycore_v1` |
| 7 | adoptloop | `adoptloop_v1` |

## Gate Checks Per Phase

### Automated Checks
- Data completeness (minimum fact/evidence count)
- Computation validity (numeric blocks ran successfully)
- PII compliance (no unresolved PII in phase inputs)
- Evidence coverage (minimum evidence per output claim)

### Human Checks
- Analyst review of key outputs
- Assumption validation
- Stakeholder sign-off (for phases 4+)

## Input Requirements Per Phase

| Phase | Required Data Types |
|---|---|
| 0 | Any documents relevant to engagement |
| 1 | Financial statements, headcount reports, cost data |
| 2 | Cost center breakdowns, vendor contracts |
| 3 | IT asset inventory, license data, SaaS contracts |
| 4 | Outputs from phases 1-3 (no new data required) |
| 5 | Org charts, HR data, role descriptions |
| 6 | AI/ML inventory, regulatory requirements |
| 7 | All prior phase outputs, change readiness data |
