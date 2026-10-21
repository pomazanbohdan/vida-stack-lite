---
instruction_id: reject-a-fix-that-only-deletes-behavior
title: Reject a fix that only deletes behavior
summary: A change that only removes or short-circuits behavior is rejected unless the root-cause analysis explicitly justifies the removal.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The diff of a candidate fix is inspected.
conditions_does_not_apply_when: The change adds behavior and does not remove a branch.
artifact_contract_output_type: deletion-check
artifact_contract_required_data:
  - the net change of the diff
  - the behavior it deletes
  - the justification for the removal
artifact_contract_verified_by: "the diff shows more than a deletion, or the removal is justified in writing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-fix-acceptance.md
status: active
revision: 1
---

# Reject a fix that only deletes behavior
No-op / behavior-deleting detector — inspect `git diff` of the fix.
If the net change only **deletes** or short-circuits behavior (removed branches, early returns that skip logic, weakened assertions, comment-outs, blanket `return null`), the fix is **rejected** unless the `reasoning_checkpoint` RCA/root-cause analysis **explicitly justifies** a removal.
This guards the "98% were deletions" failure mode.
