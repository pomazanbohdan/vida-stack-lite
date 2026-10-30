---
instruction_id: degrade-the-whole-capability-never-part-of-it
title: "Degrade the whole capability, never part of it"
summary: "When a detection gate of an optional capability misses, the capability is off in full and the standard path runs unchanged; it never half-activates."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: An optional capability is being enabled and one of its activation checks does not pass.
conditions_does_not_apply_when: No optional capability is involved in the step.
artifact_contract_output_type: activation-decision
artifact_contract_required_data:
  - the gate that did not pass
  - the path that runs instead
  - what the caller may not assume
artifact_contract_verified_by: the standard path runs unmodified and the capability contributes nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/claude-orchestration/fragments/plan-post.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade the whole capability, never part of it
- The Workflow backend never partially activates; the executor MUST NOT assume parallelism, a shared budget, or resume-from-run-id semantics when `backend == "inline"`.
- Detection is fail-closed end-to-end: capability disabled, non-Claude runtime, `execution_backend:"inline"`, missing/incapable host descriptor, unknown or below-floor Agent SDK version, or an `emitWorkflowScript` failure on a malformed wave manifest — ANY of these degrades to `backend:"inline"` and execute-phase's standard inline dispatch (step 3) runs unmodified.
- This is advisory, not mandatory — the stable local planner remains the default.
