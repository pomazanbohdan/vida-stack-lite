---
instruction_id: keep-orchestrator-procedure-out-of-the-executor-prompt
title: Keep orchestrator procedure out of the executor prompt
summary: Procedure that belongs to the coordinator is never injected into the prompt of the role that executes; the two roles keep their own responsibilities.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A fragment of procedure is about to be added to another role's prompt."
conditions_does_not_apply_when: "The fragment is genuinely about the receiving role's own work."
artifact_contract_output_type: role-boundary
artifact_contract_required_data:
  - the role that owns the procedure
  - the role the fragment was about to enter
  - the reason the split holds
artifact_contract_verified_by: "no orchestrator procedure reaches the executor's prompt"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep orchestrator procedure out of the executor prompt
- Injecting orchestrator instructions into executor prompts violates the loop's role partition (the orchestrator orchestrates, the executor executes), so the contribution was removed ([#4740]).
- The orchestrator is deliberately thin. It does not reason about the domain, does not write code, and does not interpret results beyond routing them to the next step.
- That boundary keeps each layer's responsibility clear and prevents the orchestrator's context from accumulating domain noise.
