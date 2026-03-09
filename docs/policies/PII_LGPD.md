# PII & LGPD Compliance Policy

## Principle: Fail-Closed

ReOrg AI operates under a **fail-closed** PII policy. When PII is detected or suspected, the system blocks further processing until the data is explicitly sanitized or approved by an authorized analyst.

## PII Detection

### Scanned Patterns
| Pattern | Regex/Method | Example |
|---|---|---|
| CPF | `\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b` | 123.456.789-00 |
| CNPJ | `\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b` | 12.345.678/0001-90 |
| Email | `\b[\w.-]+@[\w.-]+\.\w{2,}\b` | name@company.com |
| Phone (BR) | `\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b` | (11) 98765-4321 |
| SSN (US) | `\b\d{3}-\d{2}-\d{4}\b` | 123-45-6789 |
| RG | `\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b` | 12.345.678-9 |

### Header-Based Detection
Column headers are scanned against a PII hint list:
`cpf`, `cnpj`, `email`, `telefone`, `phone`, `celular`, `nome`, `name`, `rg`, `endereco`, `address`, `cep`, `birth`, `nascimento`, `ssn`, `social_security`

### Scan Scope
- **Text files**: Full content scan (first 10KB for initial detection)
- **CSV files**: Header scan + cell content scan
- **XLSX files**: Per-sheet header scan + cell content scan
- **Binary files** (PDF, DOCX): Marked as `pii_risk: "unknown"` until parsed

## Document Lifecycle

```
Upload → PII Scan → [Clean] → Classification → Extraction
                  → [PII Detected] → BLOCKED → Sanitize → Re-scan → [Clean]
```

## Sanitization

### Text Documents
- PII patterns replaced with type-appropriate placeholders (`[CPF_REDACTED]`, etc.)

### CSV Documents
- Columns matching PII header hints are dropped entirely
- Remaining content scanned for inline PII

### XLSX Documents
- Per-sheet column drop for PII header matches
- Remaining content scanned for inline PII

## Evidence Handling

- Evidence snippets are stored with `snippetRedacted: true` by default
- PII redaction agent processes snippets before storage
- Original unredacted snippets are never persisted

## LGPD Compliance Measures

1. **Lawful basis**: Data processing for legitimate business interest (restructuring analysis)
2. **Data minimization**: Only extract facts relevant to the engagement
3. **Purpose limitation**: Data used solely for restructuring analysis
4. **Storage limitation**: Retention policies enforce deletion schedules
5. **Data subject rights**: Tenant owners can request data export/deletion
6. **Breach notification**: Audit trail supports incident investigation

## Audit Trail

All PII-related events are logged:
- Document PII scan results
- Sanitization actions
- PII-blocked document access attempts
- Analyst overrides (with justification)
