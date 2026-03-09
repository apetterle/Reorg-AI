# Changelog — Full Scope Implementation

## 2025-06-02: Full Scope Alignment

### Added
- Database schema upgrades: new columns on documents, jobs, projects tables
- `authSessions` table for future token-based auth
- `jobSteps` table with step tracking
- Storage adapter pattern (LocalStorageAdapter + R2StorageAdapter interface)
- Document parsers: CSV (`parseCsvPreview`, `sanitizeCsv`), XLSX (`parseXlsxPreview`, `sanitizeXlsx`)
- PII scanner enhancements: `scanHeadersForPii`, CNPJ regex, `redactText`
- Background job runner: `claimJob` (FOR UPDATE SKIP LOCKED), `heartbeatJob`, `runLoop`
- Job processors: ingest, extract, sanitize, valuescope, export
- Structured error handling: `ApiError` class with typed codes
- Structured JSON logger with levels
- RBAC module: `getMembershipOrThrow`, `requireRole` with role hierarchy
- Phase progress stepper component (phases 0-7)
- Phase workspace template (left rail, main, right drawer)
- Data upload wizard (5-step: Upload, Preview, Mapping, Validate, Confirm)
- Numeric computation blocks: baseline_kpis, opportunity_sizing, roi_estimate, confidence_weighting
- Prompt library: 5 versioned templates
- Agent contracts: 5 agents with I/O schemas (YAML)
- Full documentation tree: PRD, risk register, policies, phase handbooks, UX specs, playbook

### Changed
- Updated `shared/schema.ts` with all reference columns
- Updated `server/storage.ts` interface for new columns
- Updated `server/routes.ts` to use storage adapter, RBAC, structured errors
- Updated `server/pii.ts` with header scanning and CNPJ

### Initial State (Pre-Alignment)
- Basic multi-tenant CRUD
- Text-only PII scanning
- Synchronous job execution
- Local filesystem storage (direct fs calls)
- Simple error handling (generic try/catch)
- console.log logging
- Basic tenant access control
