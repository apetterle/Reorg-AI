# ReOrg AI

## Overview
ReOrg AI is a multi-tenant web application that implements an 8-phase consulting methodology. It automates document ingestion, ensures PII/LGPD compliance, facilitates human-in-the-loop fact approval, generates deterministic ValueScope artifacts, and provides export functionalities. The platform is designed for consulting firms to manage client engagements efficiently, offering enterprise-grade features such as a Document Bundle pipeline, robust navigation, artifact versioning, audit trails, and compliance reports. The project aims to streamline consulting processes, enhance data-driven decision-making, and provide a comprehensive solution for organizational transformation.

## User Preferences
I want iterative development and prefer that you ask before making major changes.

## System Architecture
The application is built with a modern web stack. The frontend uses React, TypeScript, Vite, TailwindCSS, Shadcn/UI for UI components, Wouter for routing, and TanStack Query for data fetching. The backend is powered by Express.js with TypeScript, utilizing Passport.js for local session-based authentication. PostgreSQL is the chosen database, managed with Drizzle ORM. File storage employs a flexible StorageAdapter pattern, supporting both local storage and R2. Background jobs are handled by an in-process job runner featuring `FOR UPDATE SKIP LOCKED` for claiming, heartbeat mechanisms, step tracking, idempotency keys, and step timeouts to ensure robust processing.

**Key Features include:**
- **Authentication & Authorization**: Session-based authentication with Passport.js, multi-tenancy support with tenant workspaces, membership management, invite system, and role-based access control (RBAC) with a defined hierarchy (tenant_owner > tenant_admin > analyst > viewer).
- **Project Management**: Creation and management of client organizations (companies) and projects, with tracking of current phases and output languages.
- **8-Phase Methodology**: Implementation of an 8-phase (0-7) consulting methodology with dependency gates and formal `phase_runs` tracking their lifecycle. `phase_gates` record decisions, evidence coverage, and checklists.
- **Data Handling**: A 5-step Data Room wizard for document upload, preview, mapping, validation, and confirmation, supporting various document types (CSV, XLSX, DOCX, PPTX). A Document Bundle Pipeline normalizes documents into a consistent format (`manifest.json`, `text.md`, `chunks.jsonl`). PII protection is fail-closed, detecting and blocking documents until sanitized.
- **Job Pipeline**: A background job runner orchestrates various processes like ingestion, extraction, sanitization, valuescope generation, export, and phase-specific runs, complete with auditing.
- **Fact & Evidence Management**: Human-in-the-loop approval workflow for facts, with evidence drawers providing lineage from document to artifact, including redacted snippets. URI-style evidence anchors (e.g., `xlsx:sheet=SheetName!r=12&c=5`) are used.
- **Artifact Management**: Deterministic numeric blocks form the basis for artifacts like `baseline_kpis`, `opportunity_sizing`, and `roi_estimate`. ValueScope generates deterministic artifacts from approved facts. Artifacts are versioned, with diff viewers and timeline, and undergo schema validation using AJV.
- **Reporting & Outputs**: Artifacts are grouped by phase, and a report generator creates various reports (executive, technical, compliance) with citations and footnotes, exportable to JSON, MD, or HTML. Professional consulting-grade rendering with KPI dashboard cards, Recharts-powered charts (bar, area, gauge), scenario comparison cards, timeline roadmaps, technology stack diagrams, and before/after comparison panels.
- **User Interface**: Enterprise-grade UI components include empty states, error boundaries, permission denied screens, role-aware controls, and data quality indicators. A comprehensive sidebar navigation and breadcrumbs enhance user experience. The Outputs section features an executive dashboard with KPI cards, phase progress charts, and per-phase artifact summaries.
- **AI Integration**: OpenAI is integrated via Replit AI Integrations for AI-powered phase processors (phases 2-7) that generate artifacts like `zerobase_rebuild`, `smartstack`, `valuecase`, `orgdna`, `aipolicycore`, and `adoptloop`. Anti-hallucination rules are enforced, ensuring AI-generated numbers originate from deterministic sources or approved facts.
- **Observability**: Structured JSON logging with correlation IDs and an audit trail for all system events.

## External Dependencies
- **OpenAI**: Integrated via Replit AI Integrations for AI model capabilities (gpt-4.1 by default) without direct API key management by the user, billed via Replit credits.
- **PostgreSQL**: Relational database used for all application data storage.
- **Cloudflare R2 (Optional)**: Used as an alternative file storage backend if R2 environment variables are configured.
- **mammoth.js**: Library used for extracting text from DOCX files.
- **adm-zip**: Library used for parsing PPTX files and extracting slide text.
- **Passport.js**: Authentication middleware for Express.js.
- **Vite**: Frontend build tool.
- **TailwindCSS**: Utility-first CSS framework.
- **Shadcn/UI**: UI component library.
- **Wouter**: Small routing library for React.
- **TanStack Query**: Data fetching library for React.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **AJV**: JSON schema validator.
- **Recharts**: Chart library for data visualization (bar, area, pie/gauge charts).

## Report Components
Reusable dashboard components in `client/src/components/report/`:
- `KpiCard.tsx` / `MetricGrid.tsx` — Hero number cards with trends
- `BarChartPanel.tsx` / `AreaChartPanel.tsx` / `GaugeChart.tsx` — Recharts visualizations
- `ComparisonPanel.tsx` — Before/After panels
- `StatusBadge.tsx` — Color-coded status indicators
- `TimelineRoadmap.tsx` — 3-wave implementation timelines
- `StackDiagram.tsx` — Technology stack layer visualization
- `ScenarioCards.tsx` — Financial scenario comparisons
- `ProcessFlowDiagram.tsx` — AS-IS → TO-BE process flows

## Artifact Detail Viewer Component Wiring
All 11 report components are wired into `ArtifactDetailViewer.tsx`:
- **Phase 0** (Readiness): MetricGrid, KPI analysis
- **Phase 1** (ValueScope): GaugeCharts, BarChartPanels, deterministic metrics
- **Phase 2** (ZeroBase): ProcessFlowDiagram for De-Para (before/after flow visualization), ComparisonPanels, Accordions for detail drill-down
- **Phase 3** (SmartStack): StackDiagram, TimelineRoadmap, BarChartPanel
- **Phase 4** (ValueCase): ScenarioCards, AreaChartPanel (5-year cumulative projection), sensitivity tables
- **Phase 5** (OrgDNA): ComparisonPanels, RACI matrices, upskilling tables
- **Phase 6** (AIPolicyCore): BarChartPanel, StatusBadges for risk controls, compliance mapping
- **Phase 7** (AdoptLoop): BarChartPanel + AreaChartPanel (metric progression Baseline→W12→W24), TimelineRoadmap, ScenarioCards

## Enterprise Security & Infrastructure
- **Helmet security headers**: X-Frame-Options, HSTS, CSP, X-Content-Type-Options, Referrer-Policy
- **CSRF protection**: Origin-check middleware on all POST/PUT/PATCH/DELETE mutations
- **PostgreSQL session store**: `connect-pg-simple` with `user_sessions` table (auto-created); sessions survive restarts
- **Graceful shutdown**: SIGTERM/SIGINT handler stops job worker, drains connections, closes DB pool
- **WebSocket layer**: `server/ws.ts` broadcasts `job:progress`, `job:completed`, `job:failed`; `useWebSocket(projectId, tenantSlug)` hook in `ProjectPage` auto-invalidates targeted React Query keys (jobs/outputs/facts/project) on events; session-authenticated connections on `/ws`
- **Artifact versioning**: `createOrVersionArtifact` in storage.ts checks for existing artifact of same type+project; creates versioned chain with `parentArtifactId` linking to root; all phase runners (phase2-7, valuescope, phase0 fallback) use it; Version Timeline and Diff Viewer functional
- **Artifact locking**: `POST /api/artifacts/:artifactId/lock` sets `locked=true` and `lockedAt`; phase runners skip locked artifacts; OutputCard passes `tenantSlug`/`projectId` for targeted cache invalidation
- **Audit events project scoping**: `audit_events` table has `projectId` column; all `createAuditEvent` call sites pass projectId; `getAuditEventsForProject` filters by projectId
- **Database indexes**: Indexes on `documents.status`, `facts.factType`, `facts.key`, `artifacts.parentArtifactId`, `audit_events.projectId`/`entityId`/`createdAt`
- **Global search**: `/api/t/:slug/search` endpoint queries documents/facts/artifacts/projects via ILIKE; `GlobalSearch` component in `AppHeader` with debounced input
- **Bulk operations**: Bulk approve/reject/delete for facts; `bulkUpdateFacts` in storage
- **PDF export**: HTML report includes print toolbar with "Save as PDF" button; print-optimized CSS with `@media print` rules, `@page` directives, `page-break` controls; toolbar auto-hides in print
- **Email notification service**: `server/email.ts` supports Resend and SendGrid APIs; templates for invite emails and phase completion notifications; graceful no-op when no provider configured
- **i18n framework**: `react-i18next` + `i18next` initialized in `client/src/i18n/`; English (`en.json`) and Brazilian Portuguese (`pt-BR.json`) translation files with 1094 keys covering 100% of UI strings; language persisted in localStorage key `reorg-language`; language switcher in AppHeader; all ~28 UI pages/components wired with `useTranslation()` hook (class components use `i18n.t()` directly); `getSectionLabel()` returns i18n keys — callers must wrap with `t()`; standalone render functions in `ArtifactDetailViewer.tsx` use `i18n.t()` directly

## PII Scanner
- `server/pii.ts` detects CPF, CNPJ, email, SSN, and Brazilian phone patterns in document content
- Header hints: columns containing "name", "email", "phone", "ssn", "cpf", etc. trigger PII blocking
- `PHONE_BR_PATTERN` requires either an area code prefix `(\d{2})` or a dash separator `\d{4,5}-\d{4}` — plain 8-9 digit numbers (e.g. financial values like 18500000) are not matched as phones

## E2E Validated Flows
- Full 8-phase run with real Trocafone Customer Support dataset (pt-BR)
- Full 8-phase run with FinServ Digital Corp / Operations AI Transformation (en) — all 8 phases produced v1 artifacts, 37 audit events, 183 unit tests passing
- All phases produce structured artifacts with professional rendering
- Outputs dashboard shows KPI cards, phase progress charts, artifact summaries
- HTML report export with cover page, TOC, inline CSS components