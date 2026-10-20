---
instruction_id: every-prerequisite-is-real-and-none-restates-the-order
title: Every prerequisite is real and none restates the order
summary: "Every dependency between items is a real prerequisite, across containers included, and none of them restates the sequence."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: The dependencies between items are checked.
conditions_does_not_apply_when: The items have no dependencies.
artifact_contract_output_type: dependency-check
artifact_contract_required_data:
  - each dependency
  - what it really needs
  - the order it does not restate
artifact_contract_verified_by: every dependency is a real prerequisite and none of them restates the order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 1
---

# Every prerequisite is real and none restates the order
Every `after` is a real prerequisite, those in other epics included, and none restates the order.
`after` holds real prerequisites only, never the sequence.
