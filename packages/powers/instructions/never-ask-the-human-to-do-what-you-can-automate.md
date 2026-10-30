---
instruction_id: never-ask-the-human-to-do-what-you-can-automate
title: Never ask the human to do what you can automate
summary: "Whatever the agent can do through a CLI or an API it does itself; a checkpoint verifies after the automation, it never replaces it."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A plan or a task would hand a step to the user.
conditions_does_not_apply_when: "Only the user can perform the step, for example an account creation or a physical action."
artifact_contract_output_type: automation-first-plan
artifact_contract_required_data:
  - the steps the agent performs itself
  - the steps that are genuinely manual
artifact_contract_verified_by: no step that the agent could perform was handed to the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never ask the human to do what you can automate
**Automation-first rule:** If
CAN do it via CLI/API,
MUST do it. Checkpoints verify AFTER automation, not replace it.
Never ask the user to do what
the agent can automate via CLI/API.
**DO:** Automate everything before checkpoint, be specific ("Visit https://myapp.vercel.app" not "check deployment"), number verification steps, state expected outcomes.
