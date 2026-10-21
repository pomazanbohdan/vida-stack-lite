---
instruction_id: write-each-requirement-as-current-target-acceptance
title: "Write each requirement as current, target, acceptance"
summary: "Every requirement carries the state today, the state it becomes, and the check that settles it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - completion-criteria
conditions_applies_when: A requirement is written.
conditions_does_not_apply_when: The requirement already carries all three fields.
artifact_contract_output_type: requirement-triple
artifact_contract_required_data:
  - the current state
  - the target state
  - the acceptance check
artifact_contract_verified_by: "each requirement carries current, target and acceptance"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/spec.md
status: active
revision: 1
---

# Write each requirement as current, target, acceptance
**Every requirement needs all three fields:**
Current: grounds the requirement in reality — what exists today?
Target: the concrete change — not "improve X" but "X becomes Y"
Acceptance: the falsifiable check — how does a verifier confirm this?
