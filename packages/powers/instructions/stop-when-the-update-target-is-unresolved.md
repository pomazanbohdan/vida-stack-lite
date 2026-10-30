---
instruction_id: stop-when-the-update-target-is-unresolved
title: Stop when the update target is unresolved
summary: An update whose target could not be resolved performs no update at all; the unresolved case is checked before the version case.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: An update flow cannot determine what it is supposed to update.
conditions_does_not_apply_when: The target was resolved.
artifact_contract_output_type: unresolved-target-report
artifact_contract_required_data:
  - the unresolved target
  - the fact that nothing was changed
artifact_contract_verified_by: the flow stopped before installing anything
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop when the update target is unresolved
this gate takes precedence over the VERSION-missing case below — a fully-unresolved target also reports version `0.0.0`, and must exit here rather than fall through to "proceed to install".
No update was performed.
