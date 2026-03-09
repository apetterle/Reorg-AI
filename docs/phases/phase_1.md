# Phase 1: ValueScope

## Goal
Extract structured facts, compute baseline KPIs, size opportunities, and generate the initial ValueScope artifact.

## Prerequisites
- Phase 0 gate passed

## Inputs
- Classified, PII-clean documents
- Extraction plan

## Process
1. Fact extraction from clean documents
2. Analyst fact curation (approve/reject/edit)
3. Numeric block computation (baseline_kpis, opportunity_sizing, roi_estimate, confidence_weighting)
4. ValueScope narrative generation
5. Number verification

## Gate Criteria
- Minimum approved fact count
- All numeric blocks computed
- Number verification passes
- Analyst sign-off

## Outputs
- Approved fact set with evidence
- Baseline KPI table
- Opportunity sizing ranges
- ROI estimate
- ValueScope narrative

## Artifacts
- `valuescope_v1`: Full ValueScope analysis
