# Data Retention Policy

## Overview

This document defines the data retention rules for ReOrg AI. All retention periods are configurable at the tenant level, with platform-wide minimums and maximums.

## Retention Periods

| Data Type | Default Retention | Minimum | Maximum | Notes |
|---|---|---|---|---|
| Uploaded documents (originals) | 90 days after project close | 30 days | 365 days | Deleted from object storage |
| Sanitized documents | 180 days after project close | 90 days | 365 days | May be retained longer for audit |
| Extracted facts | Project lifetime + 90 days | 30 days | 365 days | Immutable once approved |
| Generated artifacts | Project lifetime + 180 days | 90 days | 730 days | Versioned; all versions retained |
| Evidence records | Same as parent artifact | — | — | Linked to artifact lifecycle |
| Audit logs | 365 days | 180 days | 730 days | Compliance requirement |
| Job records | 90 days after completion | 30 days | 365 days | Include step details |
| User sessions | 30 days of inactivity | 1 day | 90 days | Auto-expired |
| Invite tokens | 7 days after creation | 1 day | 30 days | Auto-expired |

## Deletion Process

1. **Soft delete**: Records marked with `deletedAt` timestamp
2. **Grace period**: 30 days after soft delete before permanent removal
3. **Permanent delete**: Data removed from database and object storage
4. **Cascade**: Deleting a project cascades to documents, facts, artifacts, evidence, jobs

## Original Document Handling

- Original uploaded documents are stored separately from sanitized copies
- `originalDeletedAt` tracks when the original was removed from storage
- Sanitized copies may be retained longer than originals
- Storage keys follow format: `tenants/{tenantId}/projects/{projectId}/uploads/{timestamp}-{hash}-{filename}`

## Tenant-Level Controls

Tenant owners can:
- Configure retention periods within allowed ranges
- Request immediate deletion of specific documents
- Export all tenant data before deletion
- Close projects (triggers retention countdown)

## Compliance

- Retention periods align with LGPD data minimization principles
- Audit logs are exempt from early deletion requests
- Deletion events are themselves logged in the audit trail
