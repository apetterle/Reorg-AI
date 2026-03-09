# Figma Import Guide

## Setting Up the Figma File

### Page Structure
1. **Page 00 — Cover/Notes**: Product overview, roles, global constraints
2. **Page 01 — IA & Flows**: FigJam diagrams and navigation decisions
3. **Page 02 — Wireframes**: Desktop-first frames for all screens
4. **Page 03 — Components**: Reusable component library
5. **Page 04 — Prototypes**: Clickable prototype flows
6. **Page 05 — Styles/Tokens**: Design tokens and color systems

### Component Library
Build these as Figma components for reuse:
- TopBar (tenant/project switcher)
- SideNav (phases 0-7 with lock/active/complete states)
- Stepper (wizard and runner variants)
- DocumentTable row with status pills
- Preview Drawer
- Mapping Table
- Validation Panel
- Job Run Card + Job Step Row
- Log Viewer
- Artifact Card
- Version Timeline
- Gate Checklist
- Evidence Drawer (list item, snippet, lineage chip)

### Design Tokens
Import the following token values:
- Spacing: 4/8/16/24/32/48px
- Border radius: small (6px for `rounded-md`)
- Status colors: blocked (red), ok (green), warning (amber), processing (blue), neutral (gray)

### Prototype Minimum Path
Project Hub > Create Project > Wizard (5 steps) > Phase 1 Workspace > Outputs > Export
