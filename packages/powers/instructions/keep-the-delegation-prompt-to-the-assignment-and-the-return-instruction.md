---
instruction_id: keep-the-delegation-prompt-to-the-assignment-and-the-return-instruction
title: Keep the delegation prompt to the assignment and the return instruction
summary: A delegated prompt carries the assignment and the return instruction and nothing else.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A task is being handed to a delegated agent.
conditions_does_not_apply_when: The task is being carried out in the current session.
artifact_contract_output_type: delegation-prompt
artifact_contract_required_data:
  - the assignment
  - the return instruction
artifact_contract_verified_by: the prompt carries the assignment and the return instruction and nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Keep the delegation prompt to the assignment and the return instruction
Agent prompts must contain ONLY the
assignment block, the skills
variable, and the return instruction.
Do not include project planning context, workflow prose, or any internal tooling references in agent prompts.
Write the doc file directly. Return confirmation only — do not return doc content.
