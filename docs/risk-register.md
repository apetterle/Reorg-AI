# ReOrg AI — Risk Register

## Risk Matrix

| ID | Category | Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|
| R01 | Data | PII leakage in outputs | Medium | Critical | Fail-closed PII scanning; snippet redaction; LGPD policy enforcement | Active |
| R02 | Data | Incorrect numeric outputs | Medium | High | Deterministic computation blocks; number verification agent; no LLM-generated numbers | Active |
| R03 | Security | Unauthorized cross-tenant data access | Low | Critical | Tenant-scoped queries; RBAC middleware; foreign key constraints | Active |
| R04 | Reliability | Job processing failures | Medium | Medium | Retry with max attempts; heartbeat monitoring; zombie lock recovery | Active |
| R05 | Compliance | LGPD non-compliance | Low | Critical | PII scanning on upload; sanitization workflow; data retention policies; audit trail | Active |
| R06 | Performance | Large file processing timeouts | Medium | Medium | Background job processing; chunked parsing; file size limits | Active |
| R07 | Data | Loss of evidence traceability | Low | High | Immutable evidence records; lineage tracking; version history | Active |
| R08 | Operational | Session data loss on restart | High | Low | In-memory sessions; plan: migrate to pg-session store | Accepted |
| R09 | Integration | LLM API availability | Medium | Medium | Graceful degradation; stubbed responses; retry logic | Active |
| R10 | Data | Document parsing failures | Medium | Medium | Format detection; graceful fallback; warning system | Active |
| R11 | Security | Session hijacking | Low | High | Secure cookies; sameSite policy; plan: CSRF tokens | Active |
| R12 | Operational | Storage capacity exhaustion | Low | Medium | Storage adapter pattern; R2 migration path; retention policies | Active |

## Risk Response Strategies

### Critical Risks (R01, R03, R05)
- Continuous monitoring via automated tests
- Regular security review cadence
- PII scanner updates as new patterns discovered

### High Impact Risks (R02, R07, R11)
- Number verification as mandatory step before artifact publication
- Immutable evidence storage design
- Security hardening roadmap

### Accepted Risks (R08)
- In-memory sessions accepted for MVP; production deployment requires pg-session migration
