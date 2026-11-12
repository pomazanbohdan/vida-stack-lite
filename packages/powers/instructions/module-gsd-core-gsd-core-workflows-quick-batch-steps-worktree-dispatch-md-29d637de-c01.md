---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-steps-worktree-dispatch-md-29d637de-c01"
title: "gsd-core: gsd-core/workflows/quick-batch/steps/worktree-dispatch.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/quick-batch/steps/worktree-dispatch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch/steps/worktree-dispatch.md\"}"
atom_ids:
  - keep-the-delegated-worker-out-of-the-shared-state
  - leave-backlogged-work-pending-never-failed
  - never-dispatch-a-unit-that-has-already-finished
atom_count: 3
atoms: "[{\"atom_id\":\"keep-the-delegated-worker-out-of-the-shared-state\",\"file_sha256\":\"3e72bbf30b29db8dab1cf4043d6d96801bb1b9d9b56f81d607b98b9da7e6a089\",\"content_sha256\":\"928fb391a5ceaf562317d7997b62e5b0a7f6f5558c9c33215bc8c669d8644f78\",\"file_bytes\":1733,\"body_bytes\":404},{\"atom_id\":\"leave-backlogged-work-pending-never-failed\",\"file_sha256\":\"dd69555d0efeba278333804d697ac055502654ab96db0a1f75974353176d8ffc\",\"content_sha256\":\"bb2689acf0c45542515d8f2cfaa109bca9c25e25588a3f987281358035ef2dd6\",\"file_bytes\":1380,\"body_bytes\":240},{\"atom_id\":\"never-dispatch-a-unit-that-has-already-finished\",\"file_sha256\":\"705a9f76eb0cc3c7361b6d8890d50e2f54044b030a83be594eac5bfac90b624d\",\"content_sha256\":\"94a8befaa0772a3b1c9c7c49f49f1d9d0cc6eb1403b2f9ef655e88aad3edea46\",\"file_bytes\":1389,\"body_bytes\":212}]"
carrier_sha256: 64cd8c5bb773cb5d88dc1220ee10ce4b7b43db1daf347a5e8fb9cc09ad6df62f
carrier_bytes: 4951
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-delegated-worker-out-of-the-shared-state -->
---
instruction_id: keep-the-delegated-worker-out-of-the-shared-state
title: Keep the delegated worker out of the shared state
summary: "A delegated worker is a leaf: it executes, it commits its own code and it returns a status, while the shared state documents and the documentation artifacts are written by the orchestrator."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker agent is dispatched to carry out a unit of work.
conditions_does_not_apply_when: The worker runs in the same session and owns the state itself.
artifact_contract_output_type: worker-contract
artifact_contract_required_data:
  - the files the worker owns
  - the files the orchestrator owns
artifact_contract_verified_by: the worker wrote only what it owns and the orchestrator wrote the shared records
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/secure-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the delegated worker out of the shared state
NEVER invoke the orchestrator or any other coordinating command — you are a leaf, not a coordinator
the orchestrator owns those writes after every item in this dispatch round completes
the orchestrator commits them at completion
Never modify implementation files
Return a structured verdict only — do NOT write
the orchestrator owns the file write
<!-- vpmodule:atom:end keep-the-delegated-worker-out-of-the-shared-state -->
<!-- vpmodule:atom:begin leave-backlogged-work-pending-never-failed -->
---
instruction_id: leave-backlogged-work-pending-never-failed
title: "Leave backlogged work pending, never failed"
summary: A unit that did not get a slot because the fan-out was full stays pending; the fan-out is never widened to compensate and a pending unit is never marked failed.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: More units are eligible than the current concurrency allows.
conditions_does_not_apply_when: Every eligible unit has already been dispatched.
artifact_contract_output_type: dispatch-plan
artifact_contract_required_data:
  - the units dispatched now
  - the units left pending
artifact_contract_verified_by: the pending units are still pending and the fan-out was not widened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Leave backlogged work pending, never failed
Not every eligible item necessarily spawns this round
cap the fan-out at the concurrency limit, minus the current in-flight count
NEVER mark these `failed`, NEVER increase fan-out to compensate
<!-- vpmodule:atom:end leave-backlogged-work-pending-never-failed -->
<!-- vpmodule:atom:begin never-dispatch-a-unit-that-has-already-finished -->
---
instruction_id: never-dispatch-a-unit-that-has-already-finished
title: Never dispatch a unit that has already finished
summary: "A unit whose result file is already on disk is not dispatched a second time; it is routed to the integration instead, because the result still belongs to the batch."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A run is resumed and a unit may already have produced its result.
conditions_does_not_apply_when: No unit has produced a result yet.
artifact_contract_output_type: dispatch-decision
artifact_contract_required_data:
  - the units that were already executed
  - the units that were dispatched
artifact_contract_verified_by: no unit with an existing result was dispatched again and it is still in the batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never dispatch a unit that has already finished
NEVER re-dispatch it into a second worktree for any id
It is not lost
dropping it here only prevents the duplicate dispatch, it does not remove it from the batch
<!-- vpmodule:atom:end never-dispatch-a-unit-that-has-already-finished -->