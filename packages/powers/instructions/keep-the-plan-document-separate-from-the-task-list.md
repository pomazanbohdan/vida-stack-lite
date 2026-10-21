---
instruction_id: keep-the-plan-document-separate-from-the-task-list
title: Keep the plan document separate from the task list
summary: "The plan document stays a markdown file, because design decisions, risks and open questions do not map onto tracker issues."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document is written and the tasks live somewhere.
conditions_does_not_apply_when: No plan document is written.
artifact_contract_output_type: plan-document
artifact_contract_required_data:
  - the design decisions
  - the risks
  - the open questions
artifact_contract_verified_by: "the plan document holds the decisions, risks and open questions that the task list cannot carry"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 4
---

# Keep the plan document separate from the task list

**Plan document:** Save the implementation plan to the plan document. This is always a markdown file — design decisions, risks, and open questions don't map cleanly onto individual tracker issues.
Create the plan directory if it does not exist.
