# ADR-001: Multi-Tenancy Architecture

## Status
Accepted

## Context
ReOrg AI serves multiple restructuring engagements simultaneously. Each engagement involves confidential client data that must be strictly isolated. We need to decide how to implement multi-tenancy.

## Decision
We use **shared database, tenant-scoped rows** approach:

1. All data tables include a `tenantId` foreign key
2. All queries filter by `tenantId`
3. The `IStorage` interface enforces tenant scoping at the data access layer
4. RBAC middleware validates tenant membership before processing requests

## Alternatives Considered

### Separate databases per tenant
- **Pro**: Strongest isolation
- **Con**: Operational complexity, migration difficulty, higher cost
- **Rejected**: Overkill for MVP scale

### Schema-per-tenant
- **Pro**: Good isolation with shared infrastructure
- **Con**: Complex migrations, connection pooling challenges
- **Rejected**: Unnecessary complexity

### Row-level security (RLS)
- **Pro**: Database-enforced isolation
- **Con**: Postgres-specific, harder to debug, session variable management
- **Rejected**: Application-level scoping is sufficient and more portable

## Consequences

### Positive
- Simple implementation
- Easy to query across tenants for platform analytics (if ever needed)
- Standard migration process

### Negative
- Application code must consistently filter by tenantId (risk of data leaks if forgotten)
- No database-level enforcement of isolation

### Mitigations
- `IStorage` interface centralizes all queries, reducing risk of missing tenant filters
- RBAC middleware validates tenant access before route handlers execute
- Automated tests verify tenant isolation
