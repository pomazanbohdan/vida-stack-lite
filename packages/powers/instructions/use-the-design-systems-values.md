---
instruction_id: use-the-design-systems-values
title: "Use the design system's values"
summary: "Take spacing, type and color from the design system: its scale, its hierarchy, its semantic tokens and its contrast rules."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "A user interface is being built and values must be chosen for spacing, type and color."
conditions_does_not_apply_when: The screen is a placeholder that will be replaced.
artifact_contract_output_type: design-system-values
artifact_contract_required_data:
  - the spacing values used
  - the heading levels used
  - the color tokens used
  - the contrast checked
artifact_contract_verified_by: "no value is invented outside the design system's scale and tokens"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
---

# Use the design system's values

## Spacing and Layout

Use a consistent spacing scale. Don't invent values:

```css
/* Use the scale: 0.25rem increments (or whatever the project uses) */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* Not on any scale */
/* Bad */   margin-top: 2.3rem; /* Not on any scale */
```

## Typography

Respect the type hierarchy:

```
h1 → Page title (one per page)
h2 → Section title
h3 → Subsection title
body → Default text
small → Secondary/helper text
```

Don't skip heading levels. Don't use heading styles for non-heading content.

## Color

- Use semantic color tokens: `text-primary`, `bg-surface`, `border-default` — not raw hex values
- Ensure sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey information (use icons, text, or patterns too)

Inline styles or arbitrary pixel values

Color as the sole indicator of state (red/green without text or icons)
