# Application Routes

## Public Routes

| Path | Page | Description |
|---|---|---|
| `/auth` | Auth Page | Login and registration |
| `/accept-invite/:token` | Accept Invite | Invite acceptance flow |

## Authenticated Routes

| Path | Page | Description |
|---|---|---|
| `/` | Dashboard | Tenant selection, workspace overview |
| `/workspace/:tenantSlug` | Workspace | Project list, tenant settings, team management |
| `/workspace/:tenantSlug/project/:projectId` | Project | Phase stepper, data room, outputs |
| `/workspace/:tenantSlug/project/:projectId/phase/:phaseId` | Phase Workspace | Phase-specific workspace with run, progress, results |

## API Routes

All API routes are prefixed with `/api/`. See `openapi/openapi.yaml` for the full API specification.
