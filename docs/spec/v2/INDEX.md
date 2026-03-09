# ReOrg AI — Specification v2 Index

## Parts

### Part 1: System Architecture
- Monolithic Express.js + Vite architecture
- PostgreSQL data model with Drizzle ORM
- Storage adapter pattern (Local + R2)
- Session-based authentication with Passport.js

### Part 2: Data Model
- Tenants, users, memberships (multi-tenancy)
- Projects, documents, facts, evidence (analysis pipeline)
- Jobs, job steps (background processing)
- Artifacts (output generation)
- Audit log (compliance)

### Part 3: Document Pipeline
- Upload and storage
- PII scanning (text + headers)
- Classification (LLM-assisted)
- Sanitization (column drop for CSV/XLSX, text redaction)
- Extraction (fact generation with evidence)

### Part 4: 8-Phase Methodology
- Phase definitions (0-7)
- Dependency graph
- Gate system (automated + human checks)
- Phase-specific artifacts

### Part 5: Numeric Computation
- Deterministic block architecture
- Block catalog (baseline_kpis, opportunity_sizing, roi_estimate, confidence_weighting)
- Lineage and traceability rules
- LLM narrative constraints

### Part 6: API Specification
- REST API design
- Authentication and RBAC
- Error handling (ApiError codes)
- Request/response contracts

### Part 7: Frontend Architecture
- React component hierarchy
- State management (TanStack Query)
- Routing (Wouter)
- UI component library (Shadcn/UI)

### Part 8: Operations
- Deployment (Replit)
- Monitoring and logging
- Data retention policies
- Security considerations
