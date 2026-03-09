# ReOrg AI — Prompt Library

## Overview

This directory contains versioned prompt templates used by ReOrg AI's LLM-powered agents. Each prompt is a self-contained document specifying the system instruction, input contract, output contract, and constraints.

## Versioning Rules

1. **Immutable versions**: Once a prompt version is published (e.g., `_v1`), it is never modified. Bug fixes or improvements create a new version (`_v2`).
2. **Naming convention**: `{task}_{subtask}_v{N}.md` — e.g., `ingest_classify_v1.md`.
3. **Changelog**: Each prompt file includes a `## Changelog` section at the bottom.
4. **Backward compatibility**: Old versions are kept for reproducibility. The active version is referenced in `agents/agents.yaml`.

## Prompt Index

| File | Agent | Purpose |
|---|---|---|
| `ingest_classify_v1.md` | ingest | Classify uploaded documents by type and relevance |
| `extract_facts_v1.md` | extract | Extract structured facts from document content |
| `valuescope_v1.md` | valuescope_narrative | Generate ValueScope narrative from approved facts |
| `evidence_snippet_redact_v1.md` | snippet_redactor | Redact PII from evidence snippets |
| `verifier_numbers_v1.md` | number_verifier | Verify numeric claims against source evidence |

## Constraints (All Prompts)

- LLMs may narrate but **never introduce new numbers**. All numeric values must originate from approved facts or explicit assumptions.
- Outputs must be valid JSON matching the specified schema.
- PII must never appear in prompt outputs. If detected, the prompt must return a `pii_blocked` status.
- Temperature should be set to 0 for deterministic outputs unless creativity is explicitly required.

## Replit Implementation Prompts

The `replit/` subdirectory contains implementation guidance prompts organized by phase (0–7), used for guiding development within the Replit environment.
