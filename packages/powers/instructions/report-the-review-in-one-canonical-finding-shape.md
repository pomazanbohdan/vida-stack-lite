---
instruction_id: report-the-review-in-one-canonical-finding-shape
title: Report the review in one canonical finding shape
summary: "Every finding of every lens lands in one array with the same five fields; an empty array is a valid result and no finding carries a severity, a priority or a rank."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - finding-severity-policy
  - finding-presentation-policy
conditions_applies_when: A lens-based review has produced findings and they are written out.
conditions_does_not_apply_when: The findings are graded for a human report that labels every finding with a severity.
artifact_contract_output_type: lens-findings
artifact_contract_required_data:
  - the lens that produced each finding
  - the location of each finding
  - the trigger condition
  - the guard or fix
  - the potential consequence
artifact_contract_verified_by: "every finding carries the five fields and none carries a severity, a priority or a rank"
compatibility_excludes:
  - label-code-review-findings
  - format-quality-findings
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 2
---

# Report the review in one canonical finding shape
One JSON array holding every finding from every lens. Each finding carries:
- `lens` — the code of the lens that produced it
- `location` — where in the content (file:line-range for code, section for documents)
- `trigger_condition` — the problem, or the condition that exposes it, in one line
- `guard_snippet` — the concrete fix, guard, or missing check
- `potential_consequence` — what goes wrong if it ships as-is
Each lens file refines these semantics for its findings and may add lens-specific fields (e.g. `kind`/`confidence` on deletion findings, `gap_shape`/`consumer`/`evidence` on verification-gap findings).
A lens file may instead declare its own findings shape and rendering — the editorial lenses render a findings table — and that shape wins for that lens's findings.
`[]` is valid when nothing is found. No severity, priority, or ranking anywhere.
