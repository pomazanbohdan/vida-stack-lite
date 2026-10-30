---
instruction_id: fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end
title: Fold mid-flight verification into the task and harvest it at the end
summary: "A would-be mid-flight verification becomes a human-check inside the task, and the verifier collects all of them into one end-of-phase batch."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The human-verification mode is the end-of-phase one.
conditions_does_not_apply_when: "The mode is the mid-flight one, or the task needs a human decision before the next task runs."
artifact_contract_output_type: human-check-block
artifact_contract_required_data:
  - the human-check block
  - the test to perform
  - the expected result
artifact_contract_verified_by: no mid-flight verification task is emitted and the human check sits inside the task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-human-verify-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Fold mid-flight verification into the task and harvest it at the end
Do **not** emit any `<task type="checkpoint:human-verify">` tasks. Every mid-flight halt costs a full executor cold-start (CLAUDE.md, MEMORY.md, STATE.md, plan re-read on respawn) because subagent context is discarded across the pause; a plan with N human-verify checkpoints pays the cold-start cost N+1 times
Instead, fold each would-be verification step into the relevant `auto` task using a `<verify><human-check>` sub-block
The verifier (Step 8) harvests every `<verify><human-check>` block at end-of-phase and consolidates them into the existing `human_needed` → `{phase_num}-UAT.md` path in `workflows/execute-phase.md`. The user reviews everything in one batch instead of paying a cold-start cost per item
`checkpoint:decision` and `checkpoint:human-action` tasks are still emitted in `end-of-phase` mode. Those gate the work itself (a choice the executor needs from the user, or an auth step only the user can perform), not post-hoc verification of completed work. Only `checkpoint:human-verify` is suppressed
