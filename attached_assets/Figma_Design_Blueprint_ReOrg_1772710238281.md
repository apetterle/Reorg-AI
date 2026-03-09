# ReOrg AI — Figma Design Blueprint

This pack contains the canonical UX artifacts to remove ambiguity for implementation (Replit/dev team).

## FigJam diagrams (editable links)

1) End-to-end User + Phase Flow (0–7)  
https://www.figma.com/online-whiteboard/create-diagram/11ba6fe7-6592-4b99-957a-223e4443ea80?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=v1%2F309NPTeEGryUGXtFDGs6rejfboYq3iUhbSqgtG4JlFp14uF8KNHSLulQSnqUskYWKNIH1pJTiWsXnTeLpVxN7vYJMgfPlwoexixkIyZ&request_id=85347db3-1e6c-4be2-9c5a-288f689c64d6

2) Information Architecture + Navigation Map  
https://www.figma.com/online-whiteboard/create-diagram/62c18bff-4912-4c22-ac32-453d0f3fb302?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=v1%2F309NPTeEGryUGXtFDGs6rejfboYq3iUhbSqgtG4JlFp14uF8KNHSLulQSnqUskYWKNIH1pJTiWsXnTeLpVxN7vYJMgfPlwoexixkIyZ&request_id=d7e87dc2-d4ec-4146-abd0-49b1cb64e420

3) Data Upload Wizard (States + Edge Cases)  
https://www.figma.com/online-whiteboard/create-diagram/9c2ea0f0-0728-4978-8f58-7133ccb2a663?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=v1%2F309NPTeEGryUGXtFDGs6rejfboYq3iUhbSqgtG4JlFp14uF8KNHSLulQSnqUskYWKNIH1pJTiWsXnTeLpVxN7vYJMgfPlwoexixkIyZ&request_id=d894ff04-c242-47d6-914c-982d8c76cf83

4) Phase Workspace Template (Reusable for Phases 1–7)  
https://www.figma.com/online-whiteboard/create-diagram/ef9e849d-8d56-473b-9373-6f29cf7cd284?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=v1%2F309NPTeEGryUGXtFDGs6rejfboYq3iUhbSqgtG4JlFp14uF8KNHSLulQSnqUskYWKNIH1pJTiWsXnTeLpVxN7vYJMgfPlwoexixkIyZ&request_id=5b457574-f640-433a-8d94-2053e5d002be

5) Outputs + Report Generator  
https://www.figma.com/online-whiteboard/create-diagram/9ff76a26-0285-4617-ada6-20e54c62a3f7?utm_source=chatgpt&utm_content=edit_in_figjam&oai_id=v1%2F309NPTeEGryUGXtFDGs6rejfboYq3iUhbSqgtG4JlFp14uF8KNHSLulQSnqUskYWKNIH1pJTiWsXnTeLpVxN7vYJMgfPlwoexixkIyZ&request_id=1ec20fd7-6d60-4b4e-88a5-e15086e514c6

## Figma file structure (recommended)

### Page 00 — Cover / Notes
- Product one-liner
- Roles (owner/admin/analyst/viewer)
- Global constraints (PII fail-closed; evidence everywhere; phases gated)

### Page 01 — IA & Flows
- Paste the 5 FigJam diagrams above (or embed screenshots) and annotate decisions.

### Page 02 — Wireframes (Desktop-first)
Create frames (Auto Layout) for:
1. Tenant Dashboard
2. Tenant Settings (Members/Invites)
3. Project Hub (list/create)
4. Project Overview (phase status + next action)
5. Data Intake Wizard:
   - Upload
   - Preview (safe) + PII banner + Sanitize CTA
   - Mapping
   - Validate
   - Confirm/Load
6. Phase Workspace Template (1 frame template, reused for phases 1–7):
   - Run panel
   - Progress bar + stepper
   - Logs
   - Outputs panel
   - Gate checklist
   - Evidence Drawer (right drawer)
7. Outputs:
   - Artifacts list (by phase)
   - Artifact detail (versions + diff)
   - Report Builder (outline + compile preview)
   - Export modal

### Page 03 — Components
Build these as reusable components:
- TopBar (tenant/project switcher)
- SideNav (phases 0–7 + icons + locked state)
- Stepper (wizard/runner)
- DocumentTable row (status pills: uploaded/blocked/sanitized/processed)
- Preview Drawer (text/table preview; warnings)
- Mapping table (field ↔ column; type)
- Validation panel (errors/warnings; quick fixes)
- Job Run card + Job Step row
- Log viewer (filter/search)
- Artifact card
- Version timeline + diff viewer
- Gate checklist (auto checks + human checks)
- Evidence Drawer:
  - Evidence list item
  - “Show snippet” (redacted) pattern
  - Lineage chip (doc → page/cell)
  - Add manual evidence

### Page 04 — Prototypes
Minimum clickable prototype:
- Project Hub → create project → wizard (upload→preview→mapping→validate→confirm) → phase 1 workspace → outputs → export.

### Page 05 — Styles / Tokens
- Spacing scale, typography scale
- Status colors for: blocked/ok/warn/processing
- Neutral palette for enterprise UI

## Interaction rules (must be explicit in Figma notes)
- Blocked docs: cannot proceed past Preview until sanitized.
- Evidence Drawer opens from any metric/claim click target.
- Gate checklist must be completed before “Unlock next phase”.
- Versioning: artifacts are immutable; new runs create new versions.

