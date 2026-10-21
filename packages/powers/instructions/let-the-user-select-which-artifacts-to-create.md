---
instruction_id: let-the-user-select-which-artifacts-to-create
title: Let the user select which artifacts to create
summary: The conversation ends with a small set of proposed outputs; nothing is written until the person selects which of them to create.
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A conversation produced candidate outputs that could be written down.
conditions_does_not_apply_when: No output is proposed.
artifact_contract_output_type: artifact-selection
artifact_contract_required_data:
  - the proposed outputs
  - the selection the person made
artifact_contract_verified_by: nothing was written that the person did not select
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 1
---

# Let the user select which artifacts to create
When the conversation reaches natural conclusions or the developer signals readiness, propose outputs.
Analyze the conversation to identify what was discussed and suggest **up to 4 outputs** from:
**Never write artifacts without explicit user selection.**
Create these? You can select specific ones or modify them.
