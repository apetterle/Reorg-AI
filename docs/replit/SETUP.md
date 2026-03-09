# ReOrg AI — Replit Setup Guide

## Prerequisites
- Replit account with access to the project
- PostgreSQL database (provided by Replit)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-configured by Replit) |
| `SESSION_SECRET` | Yes (prod) | Secret for session encryption |
| `LOCAL_STORAGE_DIR` | No | Local storage directory (default: `./uploads`) |
| `R2_ENDPOINT` | No | Cloudflare R2 endpoint (enables R2 storage) |
| `R2_BUCKET` | No | R2 bucket name |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |

## Getting Started

1. The project auto-starts via the "Start application" workflow
2. Run `npm run dev` to start Express + Vite development server
3. Database schema is applied automatically via Drizzle
4. Demo data seeds on first run (login: `demo` / `demo123`)

## Development Workflow

1. Edit files in the Replit editor
2. The dev server auto-restarts on changes
3. Frontend hot-reloads via Vite HMR
4. Run tests: `npm test`
5. Database push: `npm run db:push`

## Project Structure

```
client/src/          Frontend (React + Vite)
server/              Backend (Express.js)
shared/              Shared types and schemas
prompts/             LLM prompt templates
agents/              Agent contracts (YAML)
numeric_blocks/      Computation block catalog
docs/                Documentation tree
tests/               Test suite
uploads/             Local file storage
```
