---
instruction_id: verify-the-decisions-not-just-the-task-completion
title: "Verify the decisions, not just the task completion"
summary: "A phase is complete when what was built is what was planned and what was planned is what was decided; the check covers requirement coverage, decision coverage and goal alignment."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A phase's work is finished and its outcome is being checked."
conditions_does_not_apply_when: The check only reports which tasks ran.
artifact_contract_output_type: goal-verification
artifact_contract_required_data:
  - the phase goal
  - the requirements that were addressed
  - the decisions that were implemented
artifact_contract_verified_by: "the check covered requirements, decisions and goal alignment, not only task completion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - product
---

# Verify the decisions, not just the task completion
- A phase is not done because execution finished without errors. It is done because what was built is what was planned, and what was planned is what was decided.
- Verification is not just testing. It checks requirement coverage (were all the REQ-IDs addressed?), decision coverage (were the decisions captured in `CONTEXT.md` actually implemented?), and overall phase goal alignment.
