---
instruction_id: automate-everything-the-agent-can-do
title: Automate everything the agent can do
summary: "Anything a command line, an API or a script can do is done by the agent; the human is asked only for what needs human judgement."
capability_tags:
  - automate-what-can-be-automated
pattern_tags:
  - human-in-the-loop
conditions_applies_when: "A step of the work has a command line, an API or a script that could perform it."
conditions_does_not_apply_when: "The step needs human judgement, or credentials only the human can supply."
artifact_contract_output_type: automated-step-list
artifact_contract_required_data:
  - the steps the agent runs itself
  - the steps left to the human
  - the reason each human step remains
artifact_contract_verified_by: no step with a command line or an API is handed over to the human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Automate everything the agent can do
The golden rule: If the agent CAN automate it, the agent MUST automate it.
Never ask user to execute CLI commands, start servers, or run builds
The agent sets up the verification environment - Start dev servers, seed databases, configure env vars
User only does what requires human judgment - Visual checks, UX evaluation, "does this feel right?"
Secrets come from user, automation comes from the agent - Ask for API keys, then the agent uses them via CLI
The rule: If it has CLI/API, the agent does it. Never ask human to perform automatable work.
Checkpoints formalize human-in-the-loop points for verification and decisions, not manual work.
