---
instruction_id: write-only-constraints-that-bend-the-design
title: Write only constraints that bend the design
summary: A constraint that rules nothing out is decoration; a constraint rules something out.
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: A specification lists constraints.
conditions_does_not_apply_when: The document carries no constraints.
artifact_contract_output_type: constraint-list
artifact_contract_required_data:
  - the constraints
  - what each one rules out
artifact_contract_verified_by: each constraint names the design it rules out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/assets/spec-template.md
status: active
revision: 1
---

# Write only constraints that bend the design
Constraints actually bend design decisions. A "constraint" that rules nothing out is decoration.
A non-negotiable that bends design. If it doesn't rule anything out, it doesn't belong.
