---
instruction_id: keep-the-failed-units-artifact-for-diagnosis
title: "Keep the failed unit's artifact for diagnosis"
summary: "When an integration of one unit fails, the isolated workspace of that unit is kept for diagnosis instead of being deleted, and the unit is not marked complete."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A unit could not be integrated and its isolated workspace still holds the evidence.
conditions_does_not_apply_when: The integration succeeded and the workspace was already removed.
artifact_contract_output_type: failed-unit-diagnosis
artifact_contract_required_data:
  - the failed unit
  - the preserved workspace
  - the failure reason
artifact_contract_verified_by: the workspace of the failed unit is still there and the unit is not marked complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the failed unit's artifact for diagnosis
do NOT remove the worktree or branch for this item; leave it for diagnosis
Do NOT mark the item complete for it
Continue with the rest of the batch
unrelated items are unaffected
