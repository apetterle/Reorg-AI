# ReOrg AI — 8-Phase Methodology

## Overview

ReOrg AI implements a structured 8-phase methodology (0–7) for corporate restructuring engagements. Each phase builds on the outputs of previous phases, with quality gates controlling progression.

## Phase Summary

| Phase | Name | Goal | Key Outputs |
|---|---|---|---|
| 0 | Setup Baseline | Ingest data, scan PII, classify documents | Document inventory, PII report, data coverage |
| 1 | ValueScope | Extract facts, compute KPIs, size opportunities | Fact set, baseline KPIs, opportunity ranges, ROI |
| 2 | ZeroBase Rebuild | Zero-based cost analysis | Cost breakdown, savings register |
| 3 | SmartStack | Technology rationalization | Tech inventory, consolidation plan |
| 4 | ValueCase | Business case compilation | Scenario models, executive summary |
| 5 | OrgDNA | Organizational design | Target operating model, transition plan |
| 6 | AIPolicyCore | AI governance framework | Policy framework, compliance matrix |
| 7 | AdoptLoop | Change management planning | Adoption roadmap, monitoring plan |

## Phase Dependencies

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3
                         │            │
                         └──────┬─────┘
                                ↓
                            Phase 4
                                │
                         ┌──────┴─────┐
                         ↓            ↓
                     Phase 5      Phase 5
                         │            │
                         └──────┬─────┘
                                ↓
                            Phase 6
                                │
                                ↓
                            Phase 7
```

**Formal dependencies**:
- Phase 1 requires Phase 0
- Phase 2 requires Phase 1
- Phase 3 requires Phase 2
- Phase 4 requires Phases 2 and 3
- Phase 5 requires Phases 2, 3, and 4
- Phase 6 requires Phases 1 through 5
- Phase 7 requires Phases 5 and 6

## Gate System

Each phase has a quality gate consisting of:

1. **Automated checks**: Data completeness, computation validity, evidence coverage
2. **Human checks**: Analyst review and sign-off
3. **Gate outcome**: Pass (unlock next phase) or Needs Work (return to fix issues)

## Phase Handbooks

Detailed implementation guides for each phase are available in this directory:
- `phase_0.md` through `phase_7.md`
