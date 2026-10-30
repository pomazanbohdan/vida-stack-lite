---
instruction_id: confirm-a-proposed-severity-before-you-record-it
title: Confirm a proposed severity before you record it
summary: "The severity of a captured item is proposed and then confirmed with the user before it is written; the canonical scale is Critical (breaks a workflow or loses data), Important (wrong behavior with no workaround) and Minor (works with a workaround, or visual polish only)."
capability_tags:
  - clarify-requirements
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A captured item is classified by severity.
conditions_does_not_apply_when: The severity was confirmed by the user earlier.
artifact_contract_output_type: severity-record
artifact_contract_required_data:
  - the suggested severity
  - the confirmed severity
  - the criterion of the confirmed level
artifact_contract_verified_by: the recorded severity was confirmed with the user and uses the canonical scale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-todo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Confirm a proposed severity before you record it
Infer a suggested severity
then CONFIRM it with the user before writing.
Never silently auto-assign: a mis-tagged severity silently corrupts backlog triage, which is exactly the signal this field exists to provide.
"Critical" - breaks a workflow or loses data; fix first
"Important" - wrong behavior with no workaround
"Minor" - works, but with a workaround or annoyance
"Minor" also covers: visual/polish only
