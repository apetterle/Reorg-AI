# Chapter 03: Document Management

## Objectives
- Upload and organize engagement documents
- Handle PII compliance requirements
- Classify documents for downstream processing

## Upload Process
1. Use the Data Upload Wizard (5-step flow)
2. Supported formats: CSV, XLSX, PDF, DOCX, TXT
3. Files are automatically scanned for PII on upload

## PII Handling
- Documents with detected PII are marked as "blocked"
- Blocked documents must be sanitized before extraction
- Sanitization removes PII columns (CSV/XLSX) or redacts text
- See `docs/policies/PII_LGPD.md` for full policy

## Classification
- Documents are classified by type and relevance
- Classification suggests which phases will use each document
- Analysts can override automatic classifications
