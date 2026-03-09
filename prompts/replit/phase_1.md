# Phase 1: ValueScope — Implementation Prompt

## Objective
Extract structured facts from clean documents, compute baseline KPIs, size opportunities, and generate the initial ValueScope artifact.

## Required Inputs
- Classified, PII-clean documents from Phase 0
- Extraction plan (focus areas, expected fact types)

## Implementation Steps

1. **Fact Extraction**: Run `extract_facts_v1` prompt on each clean document. Create fact records with evidence references. For CSV/XLSX, create facts per numeric column.

2. **Fact Curation**: Present extracted facts for analyst review. Allow approve/reject/edit. Track fact status transitions.

3. **Numeric Block Computation**:
   - `baseline_kpis`: Normalize approved KPI facts into consistent table format
   - `opportunity_sizing`: Compute opportunity ranges from baseline + assumptions
   - `roi_estimate`: Calculate ROI/payback from costs + savings
   - `confidence_weighting`: Aggregate weighted by confidence and evidence count

4. **ValueScope Narrative**: Use `valuescope_v1` prompt to generate contextual narrative around numeric block outputs. Verify with `verifier_numbers_v1`.

5. **Artifact Generation**: Store `valuescope_v1` artifact with per-fact lineage and timestamp.

## Gate Criteria
- Minimum number of approved facts (configurable)
- All numeric block computations complete
- Number verification passes (no fabricated numbers)
- Analyst sign-off on ValueScope summary

## Outputs
- Approved fact set with evidence
- Baseline KPI table
- Opportunity sizing ranges
- ROI estimate
- ValueScope narrative artifact
