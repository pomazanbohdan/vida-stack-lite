---
instruction_id: separate-a-planning-gap-from-an-execution-failure
title: Separate a planning gap from an execution failure
summary: "Code that changed after the plan was written is a planning gap, not a failed execution, and it is reported as a note."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A required artifact is missing and the code that would provide it changed after the plan was written.
conditions_does_not_apply_when: The plan was executed as written and the result is wrong.
artifact_contract_output_type: gap-classification
artifact_contract_required_data:
  - what the plan required
  - what the code contains now
  - the classification of the gap
artifact_contract_verified_by: the verdict names the gap as a planning gap and does not fail the execution
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate a planning gap from an execution failure
Assessment: The executor correctly completed all planned tasks. The gap is a **planning ordering issue**, not an execution failure.
Status: PASS_WITH_NOTES -- Executor did what was planned. Unconsolidated regex noted as follow-up, not as a failure of this phase.
The verifier distinguished between what was planned vs what exists now. Code that changed AFTER plan creation is a planning gap, not an executor failure.
This prevents false FAIL verdicts on correctly-executed work.
