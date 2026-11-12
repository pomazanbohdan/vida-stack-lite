---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-multi-agent-orchestration-md-10239e53-c01"
title: "gsd-core: docs/explanation/multi-agent-orchestration.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:docs/explanation/multi-agent-orchestration.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/multi-agent-orchestration.md\"}"
atom_ids:
  - give-an-agent-only-the-tools-its-role-needs
  - group-the-work-into-waves-before-you-spawn-anything
  - keep-the-orchestrator-to-loading-spawning-and-collecting
  - make-operations-idempotent
  - run-the-shared-hook-once-per-wave-not-once-per-commit
  - separate-shared-state-before-serializing
atom_count: 6
atoms: "[{\"atom_id\":\"give-an-agent-only-the-tools-its-role-needs\",\"file_sha256\":\"fd4c9d651af5ca517d24c2556faa62713de2de1424f5b79ce512c68eacf09170\",\"content_sha256\":\"52b22d8b2b210311977b02546f631009c180e1a8ecada21d5e70dd207e862cbb\",\"file_bytes\":1453,\"body_bytes\":304},{\"atom_id\":\"group-the-work-into-waves-before-you-spawn-anything\",\"file_sha256\":\"6a12af60837b0705b4cd14bac8993b65c71f177429f4ecbf3927fbc055db8e7d\",\"content_sha256\":\"a842f826743aadddea6cbe68c28952c826da0967e345d9fc48006a64a5b933fa\",\"file_bytes\":1388,\"body_bytes\":222},{\"atom_id\":\"keep-the-orchestrator-to-loading-spawning-and-collecting\",\"file_sha256\":\"1d32a97e0cf1bac41d00a0f89809c15ecf760e7dcb1680d89f7c4a43b3c8c5ea\",\"content_sha256\":\"131556444051ae9df479d5ef0e61cd98838f3e576fb81e5fef4fa50e80d5e2e3\",\"file_bytes\":1558,\"body_bytes\":385},{\"atom_id\":\"make-operations-idempotent\",\"file_sha256\":\"b0d8c5ae96bac23b76a3dbd6191b71c8878d2c3dee6279ae80d21417a17d9701\",\"content_sha256\":\"b14f7d0e3b70effa0e8d657936418457e30f17eae92fa13355518348582436df\",\"file_bytes\":2815,\"body_bytes\":1587},{\"atom_id\":\"run-the-shared-hook-once-per-wave-not-once-per-commit\",\"file_sha256\":\"20981525c809a7dba8fdbc4635d7e10046f50c37282508ff178098ec043eced5\",\"content_sha256\":\"4df0cb3c2f479bd47afc81111cf8ea1325346a9e1b03d5fd7a9b793afb91c5e5\",\"file_bytes\":1598,\"body_bytes\":360},{\"atom_id\":\"separate-shared-state-before-serializing\",\"file_sha256\":\"5680c358d82fb939e2fc5d6409c20fb54724e4aa5ef6fd16ad2478ca607a2276\",\"content_sha256\":\"f3ea0fb0c9f6590d4ddb3eb7897a69b1e38aca4fa042a2d81791ba2eba1b5fb5\",\"file_bytes\":2549,\"body_bytes\":1239}]"
carrier_sha256: f007e8123934491cea3acc5e7a178886a98ae26574fdd4c8b74f79cc8f4b5428
carrier_bytes: 12246
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-an-agent-only-the-tools-its-role-needs -->
---
instruction_id: give-an-agent-only-the-tools-its-role-needs
title: Give an agent only the tools its role needs
summary: "An agent that only reads files and writes one document gets exactly those capabilities, so the blast radius of an unexpected behaviour stays small."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - control-tiering
conditions_applies_when: A role is defined and its capability surface is being set.
conditions_does_not_apply_when: The role needs every capability the host offers.
artifact_contract_output_type: role-capability-surface
artifact_contract_required_data:
  - the capabilities the role is given
  - the capabilities it is denied
  - the blast radius that follows
artifact_contract_verified_by: the role carries only the capabilities its work needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give an agent only the tools its role needs
- An agent that only needs to read files and write a single output document gets exactly those permissions — no Bash execution, no access to broader state.
- That constraint is intentional: it keeps the blast radius small if an agent behaves unexpectedly.
<!-- vpmodule:atom:end give-an-agent-only-the-tools-its-role-needs -->
<!-- vpmodule:atom:begin group-the-work-into-waves-before-you-spawn-anything -->
---
instruction_id: group-the-work-into-waves-before-you-spawn-anything
title: Group the work into waves before you spawn anything
summary: "The dependencies declared by the units of work are read first and the units are grouped into waves, so a unit never starts before the units it depends on."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several units of work are about to be dispatched in parallel.
conditions_does_not_apply_when: There is only one unit of work.
artifact_contract_output_type: wave-analysis
artifact_contract_required_data:
  - the declared dependencies
  - the wave each unit was placed in
  - what may run at the same time
artifact_contract_verified_by: the waves were computed from the declared dependencies before anything was dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Group the work into waves before you spawn anything
- Before spawning any executor, the orchestrator performs a **wave analysis**: it reads the dependency declarations in each `PLAN.md` file and groups plans into waves.
<!-- vpmodule:atom:end group-the-work-into-waves-before-you-spawn-anything -->
<!-- vpmodule:atom:begin keep-the-orchestrator-to-loading-spawning-and-collecting -->
---
instruction_id: keep-the-orchestrator-to-loading-spawning-and-collecting
title: "Keep the orchestrator to loading, spawning and collecting"
summary: "The orchestrator loads the context, spawns the right agent, collects the result and updates the shared state; it does no work of its own."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The orchestrator is about to do the work itself instead of dispatching it.
conditions_does_not_apply_when: The work is a single step that needs no dispatch.
artifact_contract_output_type: thin-orchestrator
artifact_contract_required_data:
  - the work the orchestrator does
  - the work it dispatches
  - the state it updates
artifact_contract_verified_by: "the orchestrator only loaded, spawned, collected and updated state"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the orchestrator to loading, spawning and collecting
- The orchestrator never does heavy lifting itself; it loads context, spawns the right agent, collects the result, and updates shared state in `.planning/`.
- a thin orchestrator spawns short-lived specialised agents, each with a **fresh 200 K-token context window** and *only the artifacts it needs* to do its specific job.
<!-- vpmodule:atom:end keep-the-orchestrator-to-loading-spawning-and-collecting -->
<!-- vpmodule:atom:begin make-operations-idempotent -->
---
instruction_id: make-operations-idempotent
title: Make operations idempotent
summary: Design operations so they converge to the correct state regardless of how many times they run or where the previous run stopped.
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: "The operation can be run again manually, after a crash, or in several processes."
conditions_does_not_apply_when: The action is guaranteed to run once and has no repeats.
artifact_contract_output_type: idempotent-operation
artifact_contract_required_data:
  - first run
  - repeat run
  - operation key
  - partial completion
artifact_contract_verified_by: two consecutive runs producing the same final state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-make-operations-idempotent/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Make operations idempotent
Design operations so they converge to the correct state regardless of how many times they run or where the previous run stopped.
Commands, lifecycle operations, and processing loops run where crashes, restarts, and retries are normal.
If partial state changes the next run's outcome, every restart becomes a debugging session.
Derive each step from the state that exists, not from what the previous run meant to do.
Read the current state, compare it to the goal, and apply only the difference.
A step written this way is safe to repeat, because a repeat finds nothing left to do.
Anything a run leaves behind, such as a lock, a temporary file, a half-written record, or a claimed job, must be recognizable as stale by the next run.
Judge staleness by evidence that stays true wherever the previous run could have stopped, not only in the common case.
A marker that the next run cannot judge turns every crash into manual cleanup.
Write to a temporary path and rename it into place, or compare artifacts by content instead of by creation order.
The test:
What happens if this runs twice in a row?
What happens if the previous run crashed at every possible point?
Does re-execution converge to the same end state?
If any answer is "it depends on what state was left behind," the operation needs a reconciliation step.
- Every write to the state file uses a lockfile with `O_EXCL` atomic creation. This prevents the read-modify-write race where two agents each read the file, modify different fields, and the later writer overwrites the earlier one's changes.
<!-- vpmodule:atom:end make-operations-idempotent -->
<!-- vpmodule:atom:begin run-the-shared-hook-once-per-wave-not-once-per-commit -->
---
instruction_id: run-the-shared-hook-once-per-wave-not-once-per-commit
title: "Run the shared hook once per wave, not once per commit"
summary: "A hook that guards a shared build artefact runs once for the whole group of parallel commits instead of once per commit, so the parallel commits cannot fight over the same lock."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several agents will commit in parallel and a hook guards a shared build artefact.
conditions_does_not_apply_when: The commits are made one at a time.
artifact_contract_output_type: wave-hook-run
artifact_contract_required_data:
  - the hook that runs once per wave
  - the contention it avoids
  - what the parallel commits skip
artifact_contract_verified_by: the hook ran once for the wave and the parallel commits did not fight over the lock
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Run the shared hook once per wave, not once per commit
- the orchestrator runs the pre-commit hook once for the wave as a whole. Executors commit with `--no-verify` to prevent build-lock contention (for example, Cargo lock fights in Rust projects) when multiple agents commit in parallel.
- The hook therefore runs once per wave rather than once per commit.
<!-- vpmodule:atom:end run-the-shared-hook-once-per-wave-not-once-per-commit -->
<!-- vpmodule:atom:begin separate-shared-state-before-serializing -->
---
instruction_id: separate-shared-state-before-serializing
title: Separate shared state before serializing it
summary: "When concurrent actors might share mutable state, eliminate the sharing first; serialize structurally only when one shared writer is a real invariant."
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: "Concurrent actors might write to the same file, branch, key, or state object."
conditions_does_not_apply_when: The actors are actually ordered and access cannot overlap.
artifact_contract_output_type: state-boundary
artifact_contract_required_data:
  - shared state
  - sharing eliminated
  - serialization mechanism
  - concurrency test
artifact_contract_verified_by: a concurrency test with two simultaneous updates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-separate-before-serializing-shared-state/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate shared state before serializing it
When concurrent actors might share mutable state, first ask whether they need the same mutable object.
If not, eliminate the sharing.
When sharing is real, enforce serialization structurally:
lockfiles, sequential phases, exclusive ownership.
Instructions and conventions are not concurrency control.
Concurrent writes to shared state create race conditions that are intermittent, hard to reproduce, and expensive to debug.
Identify shared mutable state: files both read and write, branches both push to, APIs both define and consume.
Default to eliminating the shared write target.
Ask whether these actors need one canonical object, or are they publishing independent facts.
Give each actor its own owned file, key, branch, or state directory, and merge only at the read or reporting boundary.
Two workers writing their own last-field into one state file is still shared mutation.
Only when one shared write target is a real invariant, serialize access structurally:
lockfiles, sequential phases, a single-writer actor, or atomic compare-and-swap.
Treat "we need a lock" as a design smell to check, not as the default answer.
- Stale locks (older than 10 seconds) are automatically cleared.
<!-- vpmodule:atom:end separate-shared-state-before-serializing -->