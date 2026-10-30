---
instruction_id: unwind-the-partial-branch-before-you-stop
title: Unwind the partial branch before you stop
summary: "A conflict that is not covered by the filter stops the run, and the checkout is put back before it stops."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A conflict appeared while the commits were replayed.
conditions_does_not_apply_when: Every commit was replayed without a conflict.
artifact_contract_output_type: unwind-record
artifact_contract_required_data:
  - the conflict
  - the state the checkout was put back to
artifact_contract_verified_by: the checkout was restored and the run did not claim a restore that did not happen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Unwind the partial branch before you stop
Anything still unmerged is a REAL conflict, outside the filter.
improvise a resolution and do not continue, which would drop the rest of the queue.
Unwind first: this loop runs in the user's own checkout, so exiting mid-sequence
would strand them on a half-built branch with cherry-pick state still live.
Never claim a restore that did not happen — say exactly where they are.
