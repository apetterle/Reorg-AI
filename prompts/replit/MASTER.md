# ReOrg AI — Replit Implementation Master Prompt

## Project Context

ReOrg AI is an enterprise restructuring analysis platform built on Express.js + Vite + React + PostgreSQL. It implements an 8-phase methodology (0–7) for corporate reorganization projects with full evidence traceability, PII compliance (LGPD), and deterministic numeric computations.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Shadcn/UI + Tailwind CSS
- **Backend**: Express.js, Passport.js (session auth), Drizzle ORM
- **Database**: PostgreSQL
- **Storage**: Local filesystem with StorageAdapter pattern (R2-ready)

## Implementation Phases

Each phase has its own implementation prompt in this directory:

| Phase | File | Focus |
|---|---|---|
| 0 | `phase_0.md` | Setup Baseline — data ingestion, PII scanning, document classification |
| 1 | `phase_1.md` | ValueScope — fact extraction, numeric blocks, opportunity sizing |
| 2 | `phase_2.md` | ZeroBase Rebuild — zero-based cost analysis |
| 3 | `phase_3.md` | SmartStack — technology stack optimization |
| 4 | `phase_4.md` | ValueCase — business case compilation |
| 5 | `phase_5.md` | OrgDNA — organizational design analysis |
| 6 | `phase_6.md` | AIPolicyCore — AI governance and policy framework |
| 7 | `phase_7.md` | AdoptLoop — change management and adoption tracking |

## Key Principles

1. **Evidence everywhere**: Every fact, metric, and claim must link to source evidence.
2. **PII fail-closed**: Documents with detected PII are blocked until sanitized.
3. **Phases are gated**: Each phase must pass quality checks before unlocking the next.
4. **LLMs narrate, never compute**: All numbers come from deterministic blocks or approved facts.
5. **Multi-tenant**: All data scoped by tenant; RBAC enforced at API level.
