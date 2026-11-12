---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-verify-phase-goal-md-afcdc5a4-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/verify-phase-goal.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/verify-phase-goal.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/verify-phase-goal.md\"}"
atom_ids:
  - keep-the-verification-sequence-in-one-canonical-place
  - let-the-gate-tier-decide-what-happens
  - stop-working-on-the-task-while-the-dispatched-agent-is-active
  - verify-the-goal-not-only-the-completed-tasks
atom_count: 4
atoms: "[{\"atom_id\":\"keep-the-verification-sequence-in-one-canonical-place\",\"file_sha256\":\"e293290274bb73f098bcbae63a7e19dcbcdfcb19c5f6aa3a3fb058be25e40013\",\"content_sha256\":\"65d67865881643c6af3022594886abfc9eff96154fe9e9ad4106c0dcfa968b4b\",\"file_bytes\":1523,\"body_bytes\":304},{\"atom_id\":\"let-the-gate-tier-decide-what-happens\",\"file_sha256\":\"e34f068d499a8d971276b1f696bb70ba5bb52a50936b695960f482c11cd37473\",\"content_sha256\":\"bdb3d8132272e3080a3cccb053c788a63d88b83826ce2ab5d6c28e1bfeab704a\",\"file_bytes\":1615,\"body_bytes\":387},{\"atom_id\":\"stop-working-on-the-task-while-the-dispatched-agent-is-active\",\"file_sha256\":\"dbb6d832a48bf9831116785e34f0ab7e463281b3160ab378e21b2db29bd6121e\",\"content_sha256\":\"95b8a010fc726fc230336b683aeadf96b57364e59799b2d99aa6b6165fe3cb3a\",\"file_bytes\":2571,\"body_bytes\":921},{\"atom_id\":\"verify-the-goal-not-only-the-completed-tasks\",\"file_sha256\":\"a18fe74e687ed4e17b02190f361cfa3fac18ab29c36c20b1ffc364b8b76aed2b\",\"content_sha256\":\"d82dfb0a67275410607d7122d72279c0b1cad39ae6c36b7131b31d5c2806c3ea\",\"file_bytes\":1363,\"body_bytes\":174}]"
carrier_sha256: 915ac376e21c0cf8f98ed1c3c963c32539d23c8ba7f49588a37ba0ceedd65bb7
carrier_bytes: 7693
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-verification-sequence-in-one-canonical-place -->
---
instruction_id: keep-the-verification-sequence-in-one-canonical-place
title: Keep the verification sequence in one canonical place
summary: "One place holds the whole verification sequence, in one order; every caller runs it identically, and no step gates on a value that does not exist yet."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one caller triggers the same verification.
conditions_does_not_apply_when: A single caller runs a one-off verification.
artifact_contract_output_type: verification-sequence
artifact_contract_required_data:
  - the sequence and its order
  - the callers that run it
  - the step that stopped the run
artifact_contract_verified_by: every caller runs the same sequence in the same order and no step gated on a value that did not exist yet
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep the verification sequence in one canonical place
it is the ONLY place the verification sequence is written, whole and in this order
There is no per-caller branch
both run every step below, in order, identically.
nothing is fingerprinted yet, and gating on it here would be a no-op by construction
<!-- vpmodule:atom:end keep-the-verification-sequence-in-one-canonical-place -->
<!-- vpmodule:atom:begin let-the-gate-tier-decide-what-happens -->
---
instruction_id: let-the-gate-tier-decide-what-happens
title: Let the gate tier decide what happens
summary: A blocking gate that blocks stops the run and an error policy never bypasses that decision; an advisory gate reports and continues.
capability_tags:
  - harden-validation
pattern_tags:
  - control-tiering
conditions_applies_when: A gate returned a verdict and the run has to decide what the verdict means.
conditions_does_not_apply_when: The gate is not tiered.
artifact_contract_output_type: gate-decision
artifact_contract_required_data:
  - the tier of the gate
  - the verdict
  - what the run did
artifact_contract_verified_by: a blocking verdict stopped the run and an advisory verdict did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/wave-post-gate-hooks.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let the gate tier decide what happens
Blocking gate (`hook.blocking == true`) AND `GATE_RESULT.block == true`: HALT — stop wave completion, do NOT proceed
This halt is **not** bypassed by `onError` — `onError` only covers command errors
not the gate's block decision.
Non-blocking gate (`hook.blocking == false`): never halts.
If block `false` and no `message`: continue silently.
<!-- vpmodule:atom:end let-the-gate-tier-decide-what-happens -->
<!-- vpmodule:atom:begin stop-working-on-the-task-while-the-dispatched-agent-is-active -->
---
instruction_id: stop-working-on-the-task-while-the-dispatched-agent-is-active
title: Stop working on the task while the dispatched agent is active
summary: While a dispatched agent works on the task the orchestrator does not touch the same task; it waits and resumes only when the result is there.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: An agent was dispatched for the task you are on.
conditions_does_not_apply_when: The agent already returned.
artifact_contract_output_type: dispatch-wait-record
artifact_contract_required_data:
  - the dispatched agent
  - the result it returned
  - the point where the work resumed
artifact_contract_verified_by: no file of the task was read or written while the agent was active
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/map-codebase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop working on the task while the dispatched agent is active
stop working on this task immediately.
Do not read more files, edit code, or run tests related to this task while the subagent is active.
Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context.
Only resume when the subagent result is available.
# Do not duplicate the work of a running agent
do NOT read any source files, analyze the codebase, or write any mapping documents independently while the subagents are active.
This prevents duplicate work and wasted context.
do NOT do any planning work for this phase independently.
Only resume planning-related work when the subagent result is available.
This prevents duplicate work, conflicting edits, and wasted context.
# Stop working on the task while the agent runs
Wait for the subagent to return its result.
Stop working on the task immediately.
<!-- vpmodule:atom:end stop-working-on-the-task-while-the-dispatched-agent-is-active -->
<!-- vpmodule:atom:begin verify-the-goal-not-only-the-completed-tasks -->
---
instruction_id: verify-the-goal-not-only-the-completed-tasks
title: "Verify the goal, not only the completed tasks"
summary: "The verification asks whether the goal was achieved, and every requirement identifier is accounted for — a full task list is not the same as a reached goal."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A finished unit is verified against the goal it was meant to reach.
conditions_does_not_apply_when: The check is a mechanical test of one function.
artifact_contract_output_type: goal-verification
artifact_contract_required_data:
  - the goal
  - the requirement identifiers
  - the accounting of every identifier
artifact_contract_verified_by: the verdict names the goal and every requirement identifier is accounted for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - product
---

# Verify the goal, not only the completed tasks
Verify the phase achieved its GOAL, not just completed tasks.
Cross-reference requirement IDs
every ID MUST be accounted for.
<!-- vpmodule:atom:end verify-the-goal-not-only-the-completed-tasks -->