---
instruction_id: carry-the-same-brief-in-every-execution-path
title: Carry the same brief in every execution path
summary: "When work is dispatched by a different mechanism, the brief carries the same content as the direct path; a summary of it does not reproduce the behaviour."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A second dispatch path is being wired for work that already has a brief.
conditions_does_not_apply_when: The work has only one dispatch path.
artifact_contract_output_type: dispatch-brief
artifact_contract_required_data:
  - the brief content
  - the path that carries it
  - what a summary would lose
artifact_contract_verified_by: both paths dispatch the same brief content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
status: active
revision: 1
---

# Carry the same brief in every execution path
- **brief** — MUST carry the same task content as step 3's inline `Agent()` prompt
- a short summary here would NOT reproduce step 3's behavior and would violate the "identical artifacts" contract.
