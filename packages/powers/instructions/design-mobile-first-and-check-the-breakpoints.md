---
instruction_id: design-mobile-first-and-check-the-breakpoints
title: Design mobile first and check the breakpoints
summary: "Build the narrow layout first, then widen it, and check the result at the four named widths."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A layout is built or changed and it must work at more than one width.
conditions_does_not_apply_when: The surface has a fixed width decided by the host.
artifact_contract_output_type: breakpoint-check
artifact_contract_required_data:
  - the mobile-first layout
  - the widths checked
  - the result at each width
artifact_contract_verified_by: the layout was checked at the four named widths
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
---

# Design mobile first and check the breakpoints

Design for mobile first, then expand:

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

Test at these breakpoints: 320px, 768px, 1024px, 1440px.

"We'll make it responsive later" | Retrofitting responsive design is 3x harder than building it from the start.
