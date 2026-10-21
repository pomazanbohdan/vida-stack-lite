---
instruction_id: do-not-roll-back-what-already-merged
title: Do not roll back what already merged
summary: "A verification that runs after the change is already integrated does not undo the integration: the failure is recorded and routed, and no automatic repair and no rollback runs behind the owner's back."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A verification of an already merged unit reports a failure.
conditions_does_not_apply_when: The change was not integrated yet and can still be abandoned before the merge.
artifact_contract_output_type: post-merge-failure-routing
artifact_contract_required_data:
  - the unit that failed
  - the failure reason
  - the routing that was chosen
artifact_contract_verified_by: the merged change was left in place and the failure was recorded instead of reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/verification-wave.md
status: active
revision: 1
---

# Do not roll back what already merged
An item this step marks `human_needed` or `failed` is NOT reverted — its worktree was already removed by the successful merge
Mark the item `failed` with the routing's `failureReason`
NO automatic gap-fix retry (v1 exclusion), NO rollback of the already-merged commit
