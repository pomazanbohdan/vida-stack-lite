---
instruction_id: never-write-a-skip-instruction-into-a-workflow
title: Never write a skip instruction into a workflow
summary: A workflow file never tells the agent to skip a step or to reorder the sequence; conditional routing stays allowed.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A workflow file is written or reviewed.
conditions_does_not_apply_when: The text is an enforcement instruction that forbids skipping.
artifact_contract_output_type: workflow-rule
artifact_contract_required_data:
  - the wording that was refused
  - the conditional routing that stays
  - the enforcement wording that is kept
artifact_contract_verified_by: no file carries a skip instruction and the sequence stays mandatory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 1
---

# Never write a skip instruction into a workflow
No file should instruct the agent to skip steps or optimize step order.
Sequential execution is mandatory.
Scan for phrases like "skip to step", "jump to step", "skip ahead", "optimize the order", "you may skip".
Exclude negation context (e.g., "do NOT skip steps", "NEVER skip") — these are enforcement instructions, not skip instructions.
Conditional routing (e.g., "if X, go to step N; otherwise step M") is valid workflow branching, not skipping.
