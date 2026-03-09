# ReOrg AI MVP - Handover Document

## Architecture Overview

ReOrg AI is a multi-tenant document analysis platform for restructuring analysts. It follows a full-stack JavaScript architecture with a clear separation between frontend and backend.

### Stack

- **Frontend**: React + Vite, TanStack Query, Wouter (routing), Shadcn/UI + Tailwind CSS
- **Backend**: Express.js with Passport.js (session-based auth)
- **Database**: PostgreSQL via Drizzle ORM
- **File Storage**: Local filesystem (`uploads/` directory)

### Directory Structure

```
client/src/         - React frontend application
  pages/            - Route-level page components
  components/ui/    - Shadcn UI primitives
  lib/              - Utilities (auth context, query client)
  hooks/            - Custom React hooks
server/             - Express backend
  routes.ts         - API route handlers
  storage.ts        - Database access layer (IStorage interface)
  auth.ts           - Passport.js authentication setup
  seed.ts           - Demo data seeding
  pii.ts            - PII detection utilities
shared/
  schema.ts         - Drizzle ORM schema, Zod validation, shared types
docs/               - This handover documentation
uploads/            - Local file storage for uploaded documents
```

## Setup

1. Ensure PostgreSQL is available via `DATABASE_URL` environment variable.
2. Set `SESSION_SECRET` environment variable (required in production).
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to start the development server (Express + Vite).
5. The database schema is applied automatically via Drizzle on startup.
6. Demo data is seeded on first run (login: `demo` / `demo123`).

## Key Design Decisions

### Multi-Tenancy
All data is scoped by `tenant_id`. Users can belong to multiple tenants via the `memberships` table with roles: owner, admin, analyst, viewer.

### Document Pipeline
1. **Upload** - Documents are uploaded and stored locally. Text files are scanned for PII.
2. **PII Review** - Documents flagged with PII risk are blocked until sanitized or approved.
3. **Extraction** - Jobs extract structured facts from clean documents.
4. **Fact Curation** - Analysts review, approve, or reject proposed facts.
5. **Artifact Generation** - Approved facts are compiled into structured artifacts (summaries, reports).

### Storage Layer
All database operations go through the `IStorage` interface in `server/storage.ts`. Routes remain thin and delegate persistence to this layer.

### Authentication
Session-based auth using `express-session` + `passport-local`. Sessions are stored in-memory (connect-pg should be used for production).

### PII Handling
- `server/pii.ts` provides regex-based PII detection (emails, SSNs, phone numbers, etc.).
- Only text-based files (txt, csv, json, xml) are scanned; binary files are marked as `pii_risk: "unknown"`.
- Evidence snippets are stored with `snippet_redacted: true` by default.

## Known Limitations

1. **No LLM integration** - Document classification, extraction planning, and narrative generation are stubbed. The spec envisions OpenAI integration for these features.
2. **No background job runner** - Jobs currently execute synchronously within HTTP handlers. The spec calls for a separate worker process with heartbeat and zombie lock recovery.
3. **Local file storage only** - No S3/cloud storage provider implemented. The `storage_provider` field supports future extension.
4. **In-memory sessions** - Sessions are not persisted to the database; server restarts log out all users.
5. **PII scanner is basic** - Only scans the first 10KB of text files using regex patterns. No specialized PDF/XLSX parsing.
6. **No CSRF protection** - Relies on `sameSite: lax` cookies for partial mitigation.

## Testing

Run the test suite with:

```bash
npm test
```

Tests use Vitest and are located in the `tests/` directory.

## API Endpoints

All endpoints are prefixed with `/api/` and require authentication unless noted.

- `POST /api/register` - Create new user account (public)
- `POST /api/login` - Authenticate (public)
- `POST /api/logout` - End session
- `GET /api/user` - Current user info
- `GET /api/tenants` - List user's tenants
- `POST /api/tenants/:tenantId/projects` - Create project
- `GET /api/tenants/:tenantId/projects` - List projects
- `POST /api/projects/:projectId/documents` - Upload document
- `GET /api/projects/:projectId/documents` - List documents
- `GET /api/projects/:projectId/facts` - List facts (filterable)
- `PATCH /api/facts/:factId` - Update fact status
- `GET /api/projects/:projectId/artifacts` - List artifacts
- `POST /api/invites` - Create workspace invite
- `POST /api/invites/accept` - Accept invite by token
