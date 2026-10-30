---
instruction_id: name-the-handoff-in-both-descriptions
title: Name the handoff in both descriptions
summary: "Where one item relies on another's output — a default, an interface, a link target — both descriptions say so, so that neither builder invents its own."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: One item relies on the output of another.
conditions_does_not_apply_when: The items are independent.
artifact_contract_output_type: handoff-list
artifact_contract_required_data:
  - the output one item relies on
  - the item that produces it
  - the line in each description that names it
artifact_contract_verified_by: both descriptions name the handoff
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
  - operations
---

# Name the handoff in both descriptions
Handoffs: where one item relies on another's output (a default, an interface, a link target), both descriptions say so, so neither builder invents its own.
