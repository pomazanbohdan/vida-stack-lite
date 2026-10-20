---
instruction_id: specify-the-what-and-the-boundaries-not-the-how
title: "Specify the what and the boundaries, not the how"
summary: "The plan states what is broken, why it matters and the approach; the how is left to the implementer behind boundaries and examples."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The intent and the boundaries of a change are written down.
conditions_does_not_apply_when: The change has no intent to state.
artifact_contract_output_type: intent-and-boundaries
artifact_contract_required_data:
  - the problem and why it matters
  - the approach
  - the invariant rules
  - the forbidden approaches
artifact_contract_verified_by: "the plan says what and where the limits are, and does not prescribe the how"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/define-requirements-and-a-specification.md
status: active
revision: 2
---

# Specify the what and the boundaries, not the how
Never over-specify "how" — use boundaries + examples instead.
What is broken or missing, and why it matters. Then the high-level approach — the "what", not the "how".
Cohesive cross-layer changes (DB+BE+UI) stay in ONE file.
Two tiers: Always = invariant rules. Never = out of scope + forbidden approaches.
The PRD describes capabilities, not implementation: features grouped, with functional requirements under stable IDs and non-functional requirements in their own section.
Technical choices go to `addendum.md`.
