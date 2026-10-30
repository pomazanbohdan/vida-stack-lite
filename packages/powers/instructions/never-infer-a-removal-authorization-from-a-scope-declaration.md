---
instruction_id: never-infer-a-removal-authorization-from-a-scope-declaration
title: Never infer a removal authorization from a scope declaration
summary: "The declaration of which paths may change and the authorization to remove a path are separate channels: a removal is never authorized by a general scope declaration."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A merge check compares the committed diff with the scope the unit declared.
conditions_does_not_apply_when: The unit declared no paths at all.
artifact_contract_output_type: scope-and-authorization-split
artifact_contract_required_data:
  - the declared scope
  - the declared removals
  - the paths outside the scope
artifact_contract_verified_by: "a path was merged only because a removal was declared for it, not because it was in the general scope"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/per-plan-worktree-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never infer a removal authorization from a scope declaration
That check is advisory — it warns, it never blocks the merge — and omitting the flag simply skips it for that plan.
Unlike `--files`, this one is **not** advisory — it is what lets the post-wave deletions guard merge a branch whose plan declared a file removal.
Matching is exact per path: a declared path merges, anything else still blocks that entry (and only that entry).
Omitting the flag keeps the guard's original behavior of blocking on any deletion at all, so a plan that declares nothing loses nothing.
