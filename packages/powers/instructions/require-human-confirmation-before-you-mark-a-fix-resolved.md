---
instruction_id: require-human-confirmation-before-you-mark-a-fix-resolved
title: Require human confirmation before you mark a fix resolved
summary: A self-verified fix waits for an explicit human confirmation before it is recorded as resolved.
capability_tags:
  - debug-root-cause
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A fix has passed its own verification.
conditions_does_not_apply_when: No fix has been verified yet.
artifact_contract_output_type: fix-closure
artifact_contract_required_data:
  - the state before confirmation
  - the state after it
artifact_contract_verified_by: the fix is only recorded as resolved after an explicit human confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/DEBUG.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Require human confirmation before you mark a fix resolved
**After self-verification passes:** - status -> "awaiting_human_verify" - Request explicit user confirmation in a checkpoint - Do NOT move file to resolved yet
