---
instruction_id: check-the-design-for-bloat-inheritance-and-shape
title: "Check the design for bloat, inheritance and shape"
summary: "Pass two is judgment: rate each category, and look for bloat, broken inheritance and a shape that does not fit — the canonical order, the required defaults, and sections that earn their place."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The mechanical coverage pass is done.
conditions_does_not_apply_when: The coverage has not been checked yet.
artifact_contract_output_type: judgment-review
artifact_contract_required_data:
  - the category verdicts
  - the findings
artifact_contract_verified_by: each category carries a verdict and the findings add information
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/validate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Check the design for bloat, inheritance and shape
Pass 2 — judgment. Verdict per category (strong / adequate / thin / broken); findings only where they add information.
Bloat & overspecification. Pixel specs where tokens cover it; source restatement (personas, FRs, scope); prose where a table works; sections no downstream consumer would read; decorative narrative untied to a decision. DESIGN.md prose may carry editorial voice; EXPERIENCE.md prose should not.
Inheritance discipline. `sources` frontmatter resolves. UJ / requirement names verbatim from sources. Glossary identical across spines and sources. Component names identical across all sections in both files. EXPERIENCE.md token references resolve to DESIGN.md tokens by name.
Shape fit. DESIGN.md sections in canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts; omittable but order-locked when present). EXPERIENCE.md required defaults present (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Dropped defaults defensible. Required-when-applicable present where triggered (Inspiration when sources / memlog show reference products or rejects; Responsive when multi-surface or breakpoints). Invented sections earn their place.
