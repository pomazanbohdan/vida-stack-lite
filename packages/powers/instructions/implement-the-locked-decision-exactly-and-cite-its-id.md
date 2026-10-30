---
instruction_id: implement-the-locked-decision-exactly-and-cite-its-id
title: Implement the locked decision exactly and cite its id
summary: A decision the user made is implemented as stated and carries its id in the task; a deferred idea stays out.
capability_tags:
  - execute-plan
pattern_tags:
  - frozen-intent
conditions_applies_when: A plan is written from decisions that were already made.
conditions_does_not_apply_when: "The area was left to the agent's judgement."
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the decision ids
  - the tasks that implement them
artifact_contract_verified_by: every locked decision is implemented and carries its id and no deferred idea appears
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Implement the locked decision exactly and cite its id
Locked Decisions (from `## Decisions`) — MUST be implemented exactly as specified. Reference the decision ID (D-01, D-02, etc.) in task actions for traceability.
Deferred Ideas (from `## Deferred Ideas`) — MUST NOT appear in plans.
Honor the user's locked decision
Note in task action: "Using X per user decision (research suggested Y)"
