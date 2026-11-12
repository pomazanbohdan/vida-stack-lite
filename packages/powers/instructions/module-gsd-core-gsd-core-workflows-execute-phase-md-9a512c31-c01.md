---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-md-9a512c31-c01"
title: "gsd-core: gsd-core/workflows/execute-phase.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/execute-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase.md\"}"
atom_ids:
  - branch-off-the-default-branch-not-the-current-head
  - describe-what-the-wave-builds-before-you-spawn
  - detect-file-overlap-between-parallel-plans
  - do-not-complete-a-phase-until-the-human-test-passes
  - do-not-redispatch-work-that-is-already-committed
  - fail-closed-when-the-evidence-cannot-be-resolved
  - hand-off-to-a-fresh-agent-with-the-state-it-needs
  - let-the-orchestrator-own-the-shared-state-files
atom_count: 8
atoms: "[{\"atom_id\":\"branch-off-the-default-branch-not-the-current-head\",\"file_sha256\":\"a407d4cd35adec5afc4a4eb3375c9045c2b4f1d96c666b9fa7ac28cc5f212592\",\"content_sha256\":\"8b74fc676179e0e299fe1d44da68bedcbdff2ff4c37c21e4772f01dc6690acfe\",\"file_bytes\":1269,\"body_bytes\":271},{\"atom_id\":\"describe-what-the-wave-builds-before-you-spawn\",\"file_sha256\":\"cf7af3e3db5f1ca3487ad55ef577154fd990bdaa544fce065fbb0839a36c4e44\",\"content_sha256\":\"d5a78f8888841424348a8fc3d76516e47178c4bdbcc9b490eca35591e49fd602\",\"file_bytes\":1359,\"body_bytes\":358},{\"atom_id\":\"detect-file-overlap-between-parallel-plans\",\"file_sha256\":\"cc3e63b21966ddbe8162f1d1e981415401b0a4d7b896d2c295798f5262f230da\",\"content_sha256\":\"9099c7b261d1e43529fa78991e5d98c2947b03b7e0cc7fb1d564ea235b554d97\",\"file_bytes\":1687,\"body_bytes\":609},{\"atom_id\":\"do-not-complete-a-phase-until-the-human-test-passes\",\"file_sha256\":\"c0579fe2edca5c24e2fe3efc0e7e734562c1c33f9945e1e7b19309b3ef482716\",\"content_sha256\":\"529c1a80da1f318e5ef13241b5d7b342c04d14927321e894f4046a9659a65211\",\"file_bytes\":1245,\"body_bytes\":204},{\"atom_id\":\"do-not-redispatch-work-that-is-already-committed\",\"file_sha256\":\"7a27d9fa43f8ebec0de6c0ec5f28c7b126e333ad250847dd21400acbda5f7d9e\",\"content_sha256\":\"2590ef283186a5785336a51fb97383e291966d2144655df696e8c2faa2f0d730\",\"file_bytes\":1312,\"body_bytes\":265},{\"atom_id\":\"fail-closed-when-the-evidence-cannot-be-resolved\",\"file_sha256\":\"80639172cdb4a604354e342a3cf7258bc788022d6baa22ff4bf339126a149bf8\",\"content_sha256\":\"c5d53c7c29299623bf6f1040ebddb659158a487a4c7548641da238aa4bdfc7e4\",\"file_bytes\":1459,\"body_bytes\":214},{\"atom_id\":\"hand-off-to-a-fresh-agent-with-the-state-it-needs\",\"file_sha256\":\"72c561deefde186fdb1748b9aca07dffa7cc4d17b78be1b573aaf2b6ae79309a\",\"content_sha256\":\"768614c356bdd6f029cd54010dd3a49f43956f50d04b428c538f0e1e7e085390\",\"file_bytes\":1444,\"body_bytes\":327},{\"atom_id\":\"let-the-orchestrator-own-the-shared-state-files\",\"file_sha256\":\"a63c807dfe99c575f325f5772159e5e1c60ac9e982f89f95dcfda9e6d1137f29\",\"content_sha256\":\"1a83682f49be5019d71e0fa2b5f5f2a81c6433b51f0ee63a164126fc8ff0fa2e\",\"file_bytes\":1236,\"body_bytes\":242}]"
carrier_sha256: 780d6c23c28663c02b5dbf5a6ba7963eb5ac815c3fa227d58b9e5037e48156a8
carrier_bytes: 12236
revision: 1
status: active
---
<!-- vpmodule:atom:begin branch-off-the-default-branch-not-the-current-head -->
---
instruction_id: branch-off-the-default-branch-not-the-current-head
title: "Branch off the default branch, not the current head"
summary: A new branch is forked from the default branch so consecutive units of work do not compound.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch is created for a unit of work.
conditions_does_not_apply_when: The run does not create branches.
artifact_contract_output_type: branch
artifact_contract_required_data:
  - the base the branch was forked from
artifact_contract_verified_by: the branch was forked from the default branch and the commits stayed on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Branch off the default branch, not the current head
Fork the new phase branch off `origin/HEAD` (the project's default branch), not the current HEAD
otherwise consecutive phases compound and stay unpushed
All subsequent commits go to this branch. User handles merging.
<!-- vpmodule:atom:end branch-off-the-default-branch-not-the-current-head -->
<!-- vpmodule:atom:begin describe-what-the-wave-builds-before-you-spawn -->
---
instruction_id: describe-what-the-wave-builds-before-you-spawn
title: Describe what the wave builds before you spawn
summary: "The round is announced with what it builds, how, and why it matters."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A round of plans is about to be dispatched.
conditions_does_not_apply_when: The round contains a single trivial plan.
artifact_contract_output_type: round-brief
artifact_contract_required_data:
  - what the round builds
  - the approach
  - why it matters
artifact_contract_verified_by: "the brief says what is built and why, not only which plan is running"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Describe what the wave builds before you spawn
read each plan's `<objective>`. Extract what's being built and why.
{2-3 sentences: what this builds, technical approach, why it matters}
Bad: "Executing terrain generation plan"
Good: "Procedural terrain generator using Perlin noise — creates height maps and biome zones. Required before vehicle physics."
<!-- vpmodule:atom:end describe-what-the-wave-builds-before-you-spawn -->
<!-- vpmodule:atom:begin detect-file-overlap-between-parallel-plans -->
---
instruction_id: detect-file-overlap-between-parallel-plans
title: Detect file overlap between parallel plans
summary: "Two plans that touch the same file do not run in parallel, and the overlap is reported as a planning defect."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several plans of one round are about to run in parallel.
conditions_does_not_apply_when: The plans of the round do not touch the same files.
artifact_contract_output_type: scheduling-decision
artifact_contract_required_data:
  - the overlapping pairs
  - the files they share
artifact_contract_verified_by: the overlapping plans ran one after the other and the overlap was reported as a planning defect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Detect file overlap between parallel plans
Before spawning any agents for this wave, inspect the `files_modified` list of all plans in the wave.
Check every pair of plans in the wave — if any two plans share even one file in their `files_modified` lists, those plans have an implicit dependency and MUST NOT run in parallel.
run all plans in the wave sequentially regardless of the global parallelization setting.
This is a safety net for plans that were incorrectly assigned to the same wave. The planner should have caught this; flag it as a planning defect so the user can replan the phase if desired.
<!-- vpmodule:atom:end detect-file-overlap-between-parallel-plans -->
<!-- vpmodule:atom:begin do-not-complete-a-phase-until-the-human-test-passes -->
---
instruction_id: do-not-complete-a-phase-until-the-human-test-passes
title: Do not complete a phase until the human test passes
summary: The phase stays pending while the items that need a person are untested.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: All automatic checks passed and a number of items still need a person to test them.
conditions_does_not_apply_when: "Every check, including the manual ones, has passed."
artifact_contract_output_type: pending-item
artifact_contract_required_data:
  - the items that need a person
  - the phase state
artifact_contract_verified_by: the phase stayed pending while the items were untested
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not complete a phase until the human test passes
All automated checks passed.
require human testing before this phase can be marked complete
The phase remains pending. No further orchestrator action
<!-- vpmodule:atom:end do-not-complete-a-phase-until-the-human-test-passes -->
<!-- vpmodule:atom:begin do-not-redispatch-work-that-is-already-committed -->
---
instruction_id: do-not-redispatch-work-that-is-already-committed
title: Do not redispatch work that is already committed
summary: Committed work is not dispatched again; the anomaly is recorded and the recovery options are offered.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The commits of a unit of work exist but its summary artifact does not.
conditions_does_not_apply_when: Neither the commits nor the summary exist.
artifact_contract_output_type: recovery-options
artifact_contract_required_data:
  - the commits found
  - the recovery options
artifact_contract_verified_by: no new executor was started and the anomaly was recorded before moving on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not redispatch work that is already committed
stop before spawning a new executor; continuing risks duplicate work
revert or supersede partial commits before dispatch
record the anomaly and move on only with explicit confirmation
Offer these recovery options:
<!-- vpmodule:atom:end do-not-redispatch-work-that-is-already-committed -->
<!-- vpmodule:atom:begin fail-closed-when-the-evidence-cannot-be-resolved -->
---
instruction_id: fail-closed-when-the-evidence-cannot-be-resolved
title: Fail closed when the evidence cannot be resolved
summary: A probe that could not be run is not read as a negative answer; the run stops for the user.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A probe that would decide whether the work happened could not be run.
conditions_does_not_apply_when: The probe ran and returned an answer.
artifact_contract_output_type: blocker
artifact_contract_required_data:
  - the probe that could not be resolved
  - the reason it stopped
artifact_contract_verified_by: an empty result was not read as a negative result and the run stopped for the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/completion-reconciliation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail closed when the evidence cannot be resolved
empty is then NOT "no commits"
the commit probe has no answer
do not route to the failure handler on it, and do not re-dispatch an executor
and stop for the user.
<!-- vpmodule:atom:end fail-closed-when-the-evidence-cannot-be-resolved -->
<!-- vpmodule:atom:begin hand-off-to-a-fresh-agent-with-the-state-it-needs -->
---
instruction_id: hand-off-to-a-fresh-agent-with-the-state-it-needs
title: Hand off to a fresh agent with the state it needs
summary: A checkpoint is continued by a fresh agent that carries the state and checks the earlier commits.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A checkpoint has been answered and the plan must continue.
conditions_does_not_apply_when: The plan continues in the same session.
artifact_contract_output_type: continuation-prompt
artifact_contract_required_data:
  - the completed tasks
  - the current task
  - the response of the person
  - the resume instructions
artifact_contract_verified_by: a fresh agent was given the state and it verified the previous commits before continuing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Hand off to a fresh agent with the state it needs
Spawn continuation agent (NOT resume)
**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.
Continuation agent verifies previous commits, continues from resume point
<!-- vpmodule:atom:end hand-off-to-a-fresh-agent-with-the-state-it-needs -->
<!-- vpmodule:atom:begin let-the-orchestrator-own-the-shared-state-files -->
---
instruction_id: let-the-orchestrator-own-the-shared-state-files
title: Let the orchestrator own the shared state files
summary: The workers leave the shared tracking files alone and the coordinator writes them once.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Several workers write to the same shared tracking files.
conditions_does_not_apply_when: One worker writes them.
artifact_contract_output_type: shared-state-update
artifact_contract_required_data:
  - the plans that completed
artifact_contract_verified_by: the workers left the shared files alone and the coordinator wrote them once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Let the orchestrator own the shared state files
The orchestrator is the single writer for these files. After worktrees are merged back, update shared artifacts once for every completed plan in the wave
Do NOT modify the shared state files.
<!-- vpmodule:atom:end let-the-orchestrator-own-the-shared-state-files -->