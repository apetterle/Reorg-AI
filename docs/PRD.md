# ReOrg AI — Product Requirements Document

## Product Vision

ReOrg AI is an enterprise-grade platform that accelerates corporate restructuring engagements through structured data analysis, evidence-based insights, and AI-assisted narrative generation. It replaces manual spreadsheet-driven analysis with a systematic 8-phase methodology.

## Target Users

| Role | Description |
|---|---|
| Tenant Owner | Creates workspaces, manages billing and team |
| Tenant Admin | Manages members, configures settings |
| Analyst | Core user: uploads data, curates facts, runs phases |
| Viewer | Read-only access to outputs and reports |

## Core Value Propositions

1. **Evidence traceability**: Every metric links to source documents, enabling audit-ready deliverables.
2. **PII compliance (LGPD)**: Fail-closed PII handling ensures regulatory compliance.
3. **Deterministic computations**: All numbers come from reproducible computation blocks, not LLM hallucinations.
4. **Structured methodology**: 8 gated phases ensure consistency across engagements.
5. **Multi-tenant isolation**: Full data isolation between client engagements.

## Functional Requirements

### FR-01: Multi-Tenant Workspace Management
- Create/join tenants via invite system
- Role-based access control (owner > admin > analyst > viewer)
- Tenant-scoped data isolation

### FR-02: Document Ingestion Pipeline
- Support CSV, XLSX, PDF, DOCX, TXT file uploads
- Automatic PII scanning (CPF, CNPJ, email, phone, names)
- Document classification by type and relevance
- Sanitization workflow for PII-flagged documents

### FR-03: Data Upload Wizard
- 5-step wizard: Upload, Preview, Mapping, Validate, Confirm
- Structured table preview for CSV/XLSX
- Schema mapping with conflict detection
- Validation with actionable error messages

### FR-04: Fact Extraction and Curation
- Automated fact extraction from clean documents
- Evidence-linked facts with confidence scores
- Analyst review workflow (approve/reject/edit)

### FR-05: 8-Phase Methodology
- Phase 0: Setup Baseline
- Phase 1: ValueScope
- Phase 2: ZeroBase Rebuild
- Phase 3: SmartStack
- Phase 4: ValueCase
- Phase 5: OrgDNA
- Phase 6: AIPolicyCore
- Phase 7: AdoptLoop
- Gated progression with quality checks

### FR-06: Numeric Computation Blocks
- Baseline KPIs normalization
- Opportunity sizing with ranges
- ROI estimation and payback calculation
- Confidence-weighted aggregation

### FR-07: Output Generation
- Phase-grouped artifact display
- Version timeline for artifacts
- Report generator with template selection
- Export in JSON, Markdown, and HTML formats

### FR-08: Background Job Processing
- Asynchronous job execution with progress tracking
- Heartbeat-based lock management
- Step-level progress visibility

## Non-Functional Requirements

### NFR-01: Performance
- Document upload: support files up to 50MB
- Preview generation: under 5 seconds for typical CSV/XLSX
- Job execution: progress updates every 2 seconds

### NFR-02: Security
- Session-based authentication
- RBAC enforcement at API level
- PII data encrypted at rest
- Audit logging for all mutations

### NFR-03: Reliability
- Graceful error handling with structured responses
- Job retry with configurable max attempts
- Data integrity via database transactions

### NFR-04: Observability
- Structured JSON logging
- Request ID tracking
- Job step progress telemetry
