---
instruction_id: give-the-visual-document-a-fixed-section-order
title: Give the visual document a fixed section order
summary: "The visual document carries machine-readable tokens in the frontmatter and a body in a canonical order; sections may be omitted when they do not apply, the order is locked when they are present."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - output-formatting
conditions_applies_when: The visual identity document is written.
conditions_does_not_apply_when: The document carries no visual identity.
artifact_contract_output_type: visual-identity-document
artifact_contract_required_data:
  - the frontmatter tokens
  - the body sections in canonical order
artifact_contract_verified_by: the sections that are present are in the canonical order and the omitted ones do not apply
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 1
---

# Give the visual document a fixed section order
YAML frontmatter (machine-readable tokens) + markdown body (human-readable rationale, prose sections).
Brand & Style — Aesthetic posture in prose. The editorial voice — what *kind* of thing this is.
Colors — Per-color story. Why each exists, where it's used, what it's *not* used for.
Typography — Type roles, ramp, and rules. Platform conventions noted semantically when inherited.
Layout & Spacing — Spacing scale narrative, grid behavior, margins, gutters, breakpoint rules.
Elevation & Depth — Shadow language and tonal layering rules.
Shapes — Corner radii rules and the aesthetic logic behind them.
Components — Per-component visual specs: anatomy, color usage, sizing, state appearance.
Do's and Don'ts — Hard visual rules — what to do, what to avoid.
Sections may be omitted when not relevant; order is locked when present.
