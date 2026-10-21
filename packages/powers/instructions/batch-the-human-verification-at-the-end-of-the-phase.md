---
instruction_id: batch-the-human-verification-at-the-end-of-the-phase
title: Batch the human verification at the end of the phase
summary: "Mid-flight human verification is not emitted as its own checkpoint: the check is folded into the task and the human reviews the whole batch at the end, because every halt pays a full cold start."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A plan would pause for a human to verify work that was already done.
conditions_does_not_apply_when: The step gates the work itself and the executor cannot continue without the answer.
artifact_contract_output_type: batched-verification
artifact_contract_required_data:
  - the human checks folded into the tasks
  - the end-of-phase batch the human reviews
  - the checkpoints that still gate the work
artifact_contract_verified_by: no mid-flight verification checkpoint was emitted and the human checks are collected into one batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-human-verify-mode.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Batch the human verification at the end of the phase
Do **not** emit any `<task type="checkpoint:human-verify">` tasks. Every mid-flight halt costs a full executor cold-start
because subagent context is discarded across the pause; a plan with N human-verify checkpoints pays the cold-start cost N+1 times - measured at "tens of thousands of tokens" per round-trip on real projects. This is the default for that reason.
Instead, fold each would-be verification step into the relevant `auto` task using a `<verify><human-check>` sub-block:
The verifier
harvests every `<verify><human-check>` block at end-of-phase and consolidates them into
one batch. The user reviews everything in one batch instead of paying a cold-start cost per item.
`checkpoint:decision` and `checkpoint:human-action` tasks are still emitted in `end-of-phase` mode. Those gate the work itself (a choice the executor needs from the user, or an auth step only the user can perform), not post-hoc verification of completed work. Only `checkpoint:human-verify` is suppressed.
A plan should not interleave multiple checkpoint types with implementation tasks. Checkpoints belong at natural verification boundaries, not scattered throughout.
**Why bad:** Verification fatigue. Users should not be asked to verify every small step. Combine into one checkpoint at the end of meaningful work.
