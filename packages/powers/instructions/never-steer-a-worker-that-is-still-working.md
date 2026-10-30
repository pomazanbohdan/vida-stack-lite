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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-progress-policy.md
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
