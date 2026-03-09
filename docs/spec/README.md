# ReOrg AI — Technical Specification

## Overview

This directory contains the technical specification for ReOrg AI, organized by domain area.

## Specification Index

| Document | Description |
|---|---|
| `v2/INDEX.md` | Version 2 specification index |

## Architecture

ReOrg AI follows a monolithic full-stack architecture:

- **Frontend**: React SPA served by Vite dev server (development) or Express static middleware (production)
- **Backend**: Express.js REST API with session-based authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Pluggable storage adapter (local filesystem or Cloudflare R2)
- **Jobs**: In-process background worker with PostgreSQL-based job queue

## Key Technical Decisions

1. **Drizzle ORM over Prisma**: Lighter weight, better SQL control, compatible with `drizzle-zod` for shared validation
2. **Session auth over JWT**: Simpler for MVP; `authSessions` table prepared for future token-based auth
3. **In-process worker over separate service**: Reduces operational complexity for MVP deployment
4. **Local storage adapter**: Default for development; R2 adapter for production scaling
5. **Deterministic numeric blocks**: Computation separated from LLM to ensure reproducibility
