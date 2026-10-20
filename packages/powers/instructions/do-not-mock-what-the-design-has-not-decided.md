---
instruction_id: do-not-mock-what-the-design-has-not-decided
title: Do not mock what the design has not decided
summary: A mock shows what the design has already decided; an open question is left open until it is answered.
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A mock or a visual reference is produced from a design.
conditions_does_not_apply_when: The composition was already decided and confirmed.
artifact_contract_output_type: mock-rule
artifact_contract_required_data:
  - the decisions the mock follows
  - the question left open
  - the new pattern that is logged instead of drawn
artifact_contract_verified_by: no composition in the mock is traceable to an open question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/assets/key-screens.md
status: active
revision: 1
---

# Do not mock what the design has not decided
Do not invent layout.
If a layout question is open, the mock is premature.
Do not introduce a new pattern the design does not declare. If you need one, log it and ask before rendering.
