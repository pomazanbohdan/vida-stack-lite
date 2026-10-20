---
instruction_id: state-the-risk-on-every-ticket
title: State the risk on every item
summary: "Every item carries a risk level, the business impact if the change is wrong, and a one-line reason; the highest level names one check outside its own criteria."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A work item is written.
conditions_does_not_apply_when: The item records a defect rather than a change.
artifact_contract_output_type: risk-statement
artifact_contract_required_data:
  - the risk level
  - the business impact if the change is wrong
  - the one-line reason
  - the outside check for the highest level
artifact_contract_verified_by: the risk level and its reason are stated and the highest level names one check outside the criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 2
---

# State the risk on every item
Risk on every ticket: `minor`, `important`, or `critical` — the business impact if this change is wrong, proposed with a one-line reason; the user's value wins.
A ticket at the `critical` level names one check outside its own criteria in Notes: a person who confirms, a suite beyond the ticket's tests, a monitor.
The build confirms or raises the risk in its plan, which is where a CI process reads it to decide how much review a change gets.
For a ticket it starts from the ticket's risk and is never lower.
