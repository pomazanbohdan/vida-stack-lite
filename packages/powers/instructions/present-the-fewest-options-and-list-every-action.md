---
instruction_id: present-the-fewest-options-and-list-every-action
title: Present the fewest options and list every action
summary: The recommended actions are grouped into as few options as possible; one option may carry several actions and every action is listed.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Several recommended actions are presented for a choice.
conditions_does_not_apply_when: There is one action and nothing to group.
artifact_contract_output_type: action-menu
artifact_contract_required_data:
  - the grouped options
  - every action each option dispatches
artifact_contract_verified_by: no recommended action is left out of the menu
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
  - operations
---

# Present the fewest options and list every action
The goal is to present the fewest options possible - one option can dispatch multiple background agents plus one inline action.
Enumerate ALL recommended actions - do not cap or truncate
Include every action, not just two.
