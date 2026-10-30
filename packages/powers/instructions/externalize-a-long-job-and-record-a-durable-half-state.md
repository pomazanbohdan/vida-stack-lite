---
instruction_id: externalize-a-long-job-and-record-a-durable-half-state
title: Externalize a long job and record a durable half-state
summary: A task that runs for hours is submitted to an external runner and the run is left in a durable half-state that a later run can pick up.
capability_tags:
  - execute-plan
pattern_tags:
  - checkpoint-and-resume
conditions_applies_when: A task is classified as long-running compute.
conditions_does_not_apply_when: The task finishes inside the normal foreground budget.
artifact_contract_output_type: external-job
artifact_contract_required_data:
  - the submitted job
  - the durable half-state
  - what is deferred until the job is verified
artifact_contract_verified_by: "the job is submitted, the half-state is committed and the completion record is deferred"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/external-job/fragments/execute-wave-post.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/long-running-operations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Externalize a long job and record a durable half-state
- If the current plan's task is tagged `<runtime_budget>long_compute</runtime_budget>` (see the plan-phase fragment), do **not** run it in the foreground — it would block the agent turn for hours. Instead externalize it and record a durable half-state:
- Do **not** write `SUMMARY.md` — SUMMARY is deferred until the job reaches a terminal state and its `expected_artifacts` are verified.
- **Resume path.** `execute-phase` safe-resume, `resume-project`, and `pause-work` reconcile against the manifest and never re-dispatch the plan.
