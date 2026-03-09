# Data Intake Wizard Specification

## Overview
5-step guided wizard for importing data into a project. Enforces PII compliance and data quality.

## Step 1: Upload
- **Component**: FileUploadZone (drag-and-drop + file picker)
- **Supported formats**: CSV, XLSX, PDF, DOCX, TXT
- **Max file size**: 50MB per file
- **Multi-file**: Yes
- **On upload**: Stream to storage, create document record with SHA-256 hash, file size, MIME type, detected kind
- **Validation**: Reject unsupported file types with clear error message
- **Edge cases**: Image-only PDF warning, partial upload retry

## Step 2: Preview
- **CSV**: Display headers and first 30 rows in table format
- **XLSX**: Show sheet tabs, display headers and first 30 rows per sheet
- **Text**: Show first 2000 characters
- **PII banner**: Red warning banner if PII detected in headers or content
- **Sanitize CTA**: Button to trigger sanitization for blocked documents
- **PII gate**: Cannot proceed to Step 3 while any document has unresolved PII

## Step 3: Mapping
- **Component**: SchemaMappingTable
- **Auto-proposal**: System proposes column-to-field mappings based on header names
- **Manual override**: User can change any mapping
- **Conflict detection**: Highlight duplicate mappings, type mismatches
- **Field types**: text, number, date, currency, percentage, categorical
- **Skip columns**: Allow excluding irrelevant columns

## Step 4: Validate
- **Required field checks**: Ensure mapped required fields have data
- **Period coverage**: Check date ranges for completeness
- **Outlier detection**: Flag values significantly outside expected ranges
- **Actionable errors**: Each error/warning includes a suggested fix
- **Severity levels**: Error (blocks confirm), Warning (allows confirm with acknowledgment)

## Step 5: Confirm
- **Summary**: Count of included/excluded documents
- **Mapping version**: Display the mapping configuration used
- **Validation status**: Show pass/warn/fail summary
- **Actions**: Load canonical data, write lineage records
- **On confirm**: Create facts/evidence from validated data, update document statuses
