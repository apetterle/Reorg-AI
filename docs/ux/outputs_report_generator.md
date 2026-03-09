# Outputs & Report Generator Specification

## Outputs Tab

### Artifact List
- Grouped by phase (0-7) with collapsible sections
- Filter by: phase, artifact type, status
- Sort by: creation date, phase, name
- Each artifact shows: name, type, version, created date, status badge

### Artifact Detail
- Version timeline (all versions listed chronologically)
- Content preview (formatted based on type)
- Evidence links (clickable to open evidence drawer)
- Export single artifact: JSON, Markdown, HTML
- Diff viewer between versions (side-by-side comparison)

## Report Generator

### Step 1: Outline
- Build report outline by selecting phases/sections to include
- Drag-and-drop reordering of sections

### Step 2: Artifact Selection
- For each section, choose which artifact version to include
- Preview artifact content inline

### Step 3: Template Selection
- **Executive**: High-level summary, key metrics, recommendations
- **Technical**: Detailed analysis, methodology, data appendices

### Step 4: Preview
- Compiled report preview
- Table of contents auto-generated
- Charts and tables rendered inline
- Evidence footnotes

### Step 5: Finalize
- Lock report version (creates immutable snapshot)
- Audit event logged
- Export bundle options: HTML, Markdown, JSON
- Download or store in object storage

## Export Formats

### JSON
```json
{
  "reportId": "uuid",
  "title": "string",
  "template": "executive | technical",
  "generatedAt": "ISO 8601",
  "sections": [
    {
      "phase": "number",
      "title": "string",
      "artifactId": "uuid",
      "artifactVersion": "number",
      "content": "object"
    }
  ]
}
```

### Markdown
- Standard Markdown with headers, tables, and lists
- Evidence references as footnotes
- Charts as placeholder descriptions

### HTML
- Self-contained HTML document with embedded CSS
- Print-optimized styles
- Interactive table of contents
