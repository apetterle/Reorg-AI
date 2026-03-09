# Information Architecture & Navigation

## Navigation Hierarchy

```
App Shell
├── TopBar
│   ├── Logo / App Name
│   ├── Tenant Switcher (if multiple tenants)
│   ├── Sidebar Toggle
│   └── User Menu / Theme Toggle
│
├── Sidebar (SideNav)
│   ├── Dashboard (home)
│   ├── Workspace
│   │   ├── Projects
│   │   ├── Settings
│   │   └── Team
│   └── Project Context (when in project)
│       ├── Overview
│       ├── Data Room
│       ├── Phase 0: Setup Baseline
│       ├── Phase 1: ValueScope
│       ├── Phase 2: ZeroBase
│       ├── Phase 3: SmartStack
│       ├── Phase 4: ValueCase
│       ├── Phase 5: OrgDNA
│       ├── Phase 6: AIPolicyCore
│       ├── Phase 7: AdoptLoop
│       └── Outputs
│
└── Main Content Area
    ├── Breadcrumb trail
    └── Page content
```

## Navigation Rules

1. **Sidebar collapses** to icon-only mode on smaller screens
2. **Phase items** show lock/active/complete icons based on state
3. **Locked phases** are visible but not navigable (show tooltip with prerequisites)
4. **Breadcrumbs** show: Workspace > Project > Phase/Section
5. **Evidence drawer** opens as right-side overlay from any clickable metric
