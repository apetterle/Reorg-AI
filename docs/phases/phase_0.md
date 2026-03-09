# Phase 0: Setup Baseline

## Goal
Establish the project data foundation by ingesting documents, scanning for PII, and classifying document types.

## Inputs
- Raw documents (CSV, XLSX, PDF, DOCX, TXT)
- Project configuration

## Process
1. Upload documents via Data Upload Wizard
2. Automatic PII scanning (text content + column headers)
3. Document classification (type, relevance, suggested phases)
4. PII resolution (sanitize or acknowledge)
5. Data coverage assessment

## Gate Criteria
- All documents uploaded and classified
- PII-flagged documents resolved
- Minimum data coverage threshold met

## Outputs
- Classified document inventory
- PII scan report
- Data coverage assessment

## Artifacts
- `baseline_inventory_v1`: Document classification summary
