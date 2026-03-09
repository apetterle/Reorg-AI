# Figma Design System Brief

## Design Tokens

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Typography Scale
- Display: 30px / 36px line-height / semibold
- Heading 1: 24px / 32px / semibold
- Heading 2: 20px / 28px / semibold
- Heading 3: 16px / 24px / medium
- Body: 14px / 20px / regular
- Caption: 12px / 16px / regular
- Overline: 11px / 16px / medium / uppercase

### Status Colors
| Status | Color | Usage |
|---|---|---|
| Blocked | Red/Destructive | PII-flagged documents, failed validations |
| OK/Success | Green | Approved facts, passed gates, clean documents |
| Warning | Amber | Partial results, low confidence, needs attention |
| Processing | Blue/Primary | Active jobs, current phase |
| Neutral | Gray/Muted | Locked phases, inactive items |

### Component Inventory
See `../Figma_Design_Blueprint` for full component list including:
- TopBar, SideNav, Stepper
- DocumentTable row with status pills
- Preview Drawer, Mapping Table
- Validation Panel, Job Run Card
- Log Viewer, Artifact Card
- Version Timeline, Gate Checklist
- Evidence Drawer components
