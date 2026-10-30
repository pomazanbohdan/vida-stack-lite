---
instruction_id: never-continue-with-an-empty-target-path
title: Never continue with an empty target path
summary: A path that did not resolve stops the operation; continuing with it turns a scoped change into a change at the root.
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: An operation writes into a path that it resolved itself.
conditions_does_not_apply_when: The path is fixed and known to be present.
artifact_contract_output_type: unresolved-path-report
artifact_contract_required_data:
  - the unresolved path
  - the damage the empty value would cause
artifact_contract_verified_by: the operation stopped before it touched anything
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sync-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never continue with an empty target path
Never proceed
with an empty or unresolved root — an empty `$DEST_ROOT` turns `rm -rf "$DEST_ROOT/$SKILL"` into `rm -rf "/$SKILL"`.
Then exit.
