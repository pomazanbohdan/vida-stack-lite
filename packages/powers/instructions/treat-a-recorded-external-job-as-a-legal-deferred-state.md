---
instruction_id: treat-a-recorded-external-job-as-a-legal-deferred-state
title: Treat a recorded external job as a legal deferred state
summary: "A unit of work whose external job is still running is deferred, not partial, and the resume reconciles it instead of dispatching a second executor."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The work handed over to an external job that has not reached a terminal state.
conditions_does_not_apply_when: The external job finished and its output was verified.
artifact_contract_output_type: deferred-job-record
artifact_contract_required_data:
  - the manifest of the external job
  - its terminal state
  - the output that was verified
artifact_contract_verified_by: no second executor was dispatched for the deferred work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat a recorded external job as a legal deferred state
the summary-absent state is a **legal deferred state**
not an illegal partial.
Resume reconciles against the manifest and must NOT re-dispatch a fresh executor for a plan with a non-terminal manifest (that would duplicate the external job).
