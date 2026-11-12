---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-executor-progress-policy-md-e25336a8-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/executor-progress-policy.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/executor-progress-policy.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/executor-progress-policy.md\"}"
atom_ids:
  - judge-a-worker-by-its-signals-not-by-a-process-list
  - never-steer-a-worker-that-is-still-working
atom_count: 2
atoms: "[{\"atom_id\":\"judge-a-worker-by-its-signals-not-by-a-process-list\",\"file_sha256\":\"35e94612e0a07698f55505321b6dd053210c3946a138b6d1184c32f294dbe66b\",\"content_sha256\":\"926bf449d5be4109c0bcc843fe83312cd34d176b0d61b7d2eb2986ac4c8a3775\",\"file_bytes\":1750,\"body_bytes\":512},{\"atom_id\":\"never-steer-a-worker-that-is-still-working\",\"file_sha256\":\"b61f88ea54db8f83bf5a6443846f528265e24e10015c320d2ccd05183b167760\",\"content_sha256\":\"345568ed6e08af3b303609db32c0c18447f95973d1a83473ece901c801a8282f\",\"file_bytes\":1833,\"body_bytes\":611}]"
carrier_sha256: f9b87c28516af9bfa0c6ffbe5780f3a575321cfea479c9484867ff7ed2024748
carrier_bytes: 3884
revision: 1
status: active
---
<!-- vpmodule:atom:begin judge-a-worker-by-its-signals-not-by-a-process-list -->
---
instruction_id: judge-a-worker-by-its-signals-not-by-a-process-list
title: "Judge a worker by its signals, not by a process list"
summary: "Progress is judged by commits, the produced artefact and the worker’s own activity — never by the absence of a visible operating-system process."
capability_tags:
  - coordinate-program
pattern_tags:
  - evidence-analysis
conditions_applies_when: The supervisor has to decide whether a delegated worker is still working.
conditions_does_not_apply_when: The worker runs as a visible local process whose state can be observed directly.
artifact_contract_output_type: worker-progress-assessment
artifact_contract_required_data:
  - the signals observed
  - the progress verdict
  - the time since the last sign of progress
artifact_contract_verified_by: the verdict rests on the named signals and not on a process listing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-progress-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Judge a worker by its signals, not by a process list
The absence of a local OS test/build process is NOT idleness
The orchestrator cannot see the child's work that way.
A native subagent runs in the runtime's own session, not as a visible local process, and an executor between two tool calls — reasoning, reading a file, waiting on a runtime round-trip — shows no process at all.
Judge progress ONLY by the signals this workflow names: commits on the expected branch
A process listing is not one of them.
<!-- vpmodule:atom:end judge-a-worker-by-its-signals-not-by-a-process-list -->
<!-- vpmodule:atom:begin never-steer-a-worker-that-is-still-working -->
---
instruction_id: never-steer-a-worker-that-is-still-working
title: Never steer a worker that is still working
summary: "A delegated worker that is still making progress is left alone: no urgency message, no interruption, no re-dispatch. Stopping it is a restart, never a nudge."
capability_tags:
  - coordinate-program
pattern_tags:
  - unattended-execution
conditions_applies_when: A delegated worker is running and the supervisor is weighing whether to push it.
conditions_does_not_apply_when: The worker has reached a terminal state or has made no progress at all.
artifact_contract_output_type: worker-intervention-decision
artifact_contract_required_data:
  - the last sign of progress
  - the intervention chosen
  - the reason
artifact_contract_verified_by: no urgency or finalization message was sent to a worker that was still progressing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-progress-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never steer a worker that is still working
The stall threshold measures a period **without meaningful progress**. It is not a maximum total runtime, and it is not a budget the executor has to finish inside.
A working executor is never steered
Messages of the "Finalize immediately", "wrap up now", "you are taking too long" family are forbidden: they arrive mid-verification and turn a correct run into a truncated one.
If an executor must be stopped, the pause in step 3 is the only route, and `kill and retry` is a clean restart — not a nudge.
Do not steer it, do not interrupt it, do not re-dispatch it.
<!-- vpmodule:atom:end never-steer-a-worker-that-is-still-working -->