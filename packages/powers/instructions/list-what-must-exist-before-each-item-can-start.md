---
instruction_id: list-what-must-exist-before-each-item-can-start
title: List what must exist before each item can start
summary: "For every item, list what must exist before it can start and before its check can run; the item builds it itself or a dependency delivers it."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: The dependencies between items are worked out.
conditions_does_not_apply_when: The items have no dependencies.
artifact_contract_output_type: needs-list
artifact_contract_required_data:
  - what must exist before each item can start
  - what must exist before its check can run
  - the item that builds it
artifact_contract_verified_by: every item lists what must exist before it and before its check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# List what must exist before each item can start
Needs: list what must exist before each item can start and before its check can run: code, schema, setup, test tooling, fixtures, an entry point, a decision, an investigation's answer. The item builds it itself, or something in its `after` delivers it.
