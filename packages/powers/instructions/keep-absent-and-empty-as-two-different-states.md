---
instruction_id: keep-absent-and-empty-as-two-different-states
title: Keep absent and empty as two different states
summary: "An absent result and an empty result are different answers and are never collapsed: absent means the answer is unknown, empty means the answer was computed and it is nothing."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: "A result may be missing or may be empty, and the two are about to be handled the same way."
conditions_does_not_apply_when: The result can only ever be present and non-empty.
artifact_contract_output_type: absent-vs-empty
artifact_contract_required_data:
  - the absent case
  - the empty case
  - what each one means to the reader
artifact_contract_verified_by: the absent case and the empty case stayed distinguishable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/workflow-fragments.md
status: active
revision: 1
---

# Keep absent and empty as two different states
- Collapsing these two states inverts behavior on the degraded path: `null` means "I don't know, so include everything"; `[]` means "I computed this, and the answer is nothing."
