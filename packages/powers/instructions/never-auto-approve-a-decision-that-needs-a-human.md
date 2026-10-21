---
instruction_id: never-auto-approve-a-decision-that-needs-a-human
title: Never auto-approve a decision that needs a human
summary: "A checkpoint that exists because a human must decide something stops for a human in every mode; an undeclared default is escalated, never guessed."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "A step is unattended, or a decision has no declared default."
conditions_does_not_apply_when: The step is a verification the agent can judge from the evidence itself.
artifact_contract_output_type: escalation-decision
artifact_contract_required_data:
  - the step that needs a human
  - the reason it cannot be decided unattended
  - the options offered
artifact_contract_verified_by: the step stopped for a human and no default was guessed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/checkpoints.md
status: active
revision: 1
---

# Never auto-approve a decision that needs a human
Irreversible or trust-establishing steps a human must actually see: package-legitimacy verification before install, any decision whose default answer would be wrong to assume
Stops for a human in auto-mode too.
Never bypassed.
Omit it and auto-mode escalates to a human instead of guessing from option order
human-action still stops (auth gates cannot be automated)
