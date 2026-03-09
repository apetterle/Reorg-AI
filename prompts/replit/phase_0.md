# Phase 0: Setup Baseline — Implementation Prompt

## Objective
Establish the project baseline by ingesting documents, scanning for PII, classifying document types, and building the initial data room.

## Required Inputs
- Uploaded documents (CSV, XLSX, PDF, DOCX, TXT)
- Project configuration (client name, output language, engagement scope)

## Implementation Steps

1. **Document Upload**: Accept files via drag-and-drop or file picker. Store via StorageAdapter. Create document records with SHA-256 hash, file size, MIME type, and detected kind.

2. **PII Scanning**: Run `buildPreview()` on each document. Scan text content and column headers for PII patterns (CPF, CNPJ, email, phone, names). Flag documents with `containsPii=true`.

3. **Document Classification**: Use `ingest_classify_v1` prompt to classify each document by type and relevance. Store classification in `classificationJson`.

4. **Data Room Setup**: Display all uploaded documents with status pills (uploaded/blocked/sanitized/processed). Show PII warnings and sanitize CTAs.

## Gate Criteria
- All documents uploaded and classified
- PII-flagged documents either sanitized or explicitly acknowledged
- Minimum data coverage threshold met (configurable per engagement)

## Outputs
- Classified document inventory
- PII scan report
- Data coverage assessment
