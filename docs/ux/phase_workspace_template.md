# Phase Workspace Template

## Overview
Reusable layout template for Phases 0-7. Each phase workspace follows the same three-panel structure.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Phase Header: Name + Status Badge + Phase Stepper           │
├──────────┬──────────────────────────────┬───────────────────┤
│ Left     │ Main Panel                   │ Right Drawer      │
│ Rail     │                              │ (collapsible)     │
│          │                              │                   │
│ Status   │ Phase Brief                  │ Evidence Panel    │
│ Inputs   │ ─────────                    │ ──────────────    │
│ Artifacts│ Run Button                   │ Evidence list     │
│          │ Progress Tracker             │ Snippet viewer    │
│          │ Logs                         │ Lineage chips     │
│          │ Results Preview              │ Add evidence      │
│          │ Gate Checklist               │                   │
│          │                              │                   │
└──────────┴──────────────────────────────┴───────────────────┘
```

## Left Rail
- **Phase selector**: Quick nav between phases with status icons
- **Status card**: Current phase state (locked/active/completed)
- **Required inputs**: List of prerequisite data/artifacts with completion status
- **Phase artifacts**: Previously generated artifacts for this phase

## Main Panel

### Phase Brief
- Goal description (1-2 sentences)
- Required inputs checklist
- Expected outputs list

### Run Controls
- Primary "Run Phase" button (disabled if prerequisites not met)
- Configuration options (if applicable)

### Execution Progress Tracker
- Real-time job step progress (via polling)
- Step list with status indicators (pending/running/complete/error)
- Elapsed time per step
- Overall progress bar

### Logs
- Filterable log viewer (info/warn/error)
- Auto-scroll with pause option

### Results Preview
- Key output metrics/tables
- Charts placeholder
- Evidence links on clickable values

### Gate Checklist
- Automated checks (data completeness, computation validity)
- Human checks (analyst review items)
- Gate outcome: Pass or Needs Work
- "Unlock Next Phase" button (enabled only when gate passes)

## Right Drawer (Evidence)
- Opens from any clickable metric/claim in results
- Shows evidence chain: Document > Page/Cell > Fact > Artifact
- Snippet viewer with redacted text
- Lineage chips for navigation
- Manual evidence entry form
