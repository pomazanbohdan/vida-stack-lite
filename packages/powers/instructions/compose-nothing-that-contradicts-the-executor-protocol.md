---
instruction_id: compose-nothing-that-contradicts-the-executor-protocol
title: Compose nothing that contradicts the executor protocol
summary: "The dispatch prompt adds nothing that contradicts the executor own gate protocol, and a missing prerequisite always reaches a human."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A dispatch prompt is composed for a worker that has its own gate protocol.
conditions_does_not_apply_when: The worker has no protocol of its own.
artifact_contract_output_type: dispatch-prompt
artifact_contract_required_data:
  - the gate semantics that were left to the executor
  - the prerequisite that has to reach a human
artifact_contract_verified_by: the prompt contains no text that overrides the gate protocol
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/per-plan-executor-routing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Compose nothing that contradicts the executor protocol
do NOT add text refusing or overriding auto-approval for a `blocking` gate
Orchestrator-composed instructions that contradict the executor's protocol win the executor's attention, stall autonomous runs at the checkpoint
Executor-side gate semantics are already complete; compose nothing about gates beyond what the template already embeds.
the missing prerequisite is a fact only a human can establish, not a verification step to rubber-stamp.
