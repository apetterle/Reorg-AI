# ReOrg AI — Handover Document

## Project Status

ReOrg AI MVP is operational with the following capabilities:
- Multi-tenant workspace management with RBAC
- Document upload, PII scanning, and sanitization
- Fact extraction and curation workflow
- Background job processing with step tracking
- 8-phase methodology with gated progression
- Artifact generation and export
- Structured error handling and logging

## Architecture Summary

- **Stack**: Express.js + React/Vite + PostgreSQL + Drizzle ORM
- **Auth**: Session-based (Passport.js)
- **Storage**: Pluggable adapter (Local FS default, R2-ready)
- **Jobs**: In-process background worker with PostgreSQL queue
- **UI**: Shadcn/UI + Tailwind CSS

## Key Files

| File | Purpose |
|---|---|
| `shared/schema.ts` | Database schema, Zod validation, shared types |
| `server/routes.ts` | API route handlers |
| `server/storage.ts` | Database access layer |
| `server/auth.ts` | Authentication setup |
| `server/pii.ts` | PII detection utilities |
| `server/storage-adapter.ts` | Object storage abstraction |
| `client/src/App.tsx` | Frontend entry point and routing |
| `client/src/pages/` | Page components |

## Running the Project

```bash
npm install
npm run dev
```

Requires:
- `DATABASE_URL` environment variable (PostgreSQL connection string)
- `SESSION_SECRET` environment variable (production)

## Testing

```bash
npm test
```

## Known Issues and Future Work

See `GAP_ANALYSIS.md` for detailed gap analysis against the full reference specification.
