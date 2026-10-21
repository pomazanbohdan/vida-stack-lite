---
instruction_id: state-the-invariant-the-plan-must-satisfy-not-the-edit
title: "State the invariant the plan must satisfy, not the edit"
summary: A finding names the property that has to hold and the evidence that it does not; the suggested route is one example among many.
capability_tags:
  - communicate-concisely
pattern_tags:
  - testable-criteria
conditions_applies_when: A defect in a plan is reported.
conditions_does_not_apply_when: The report is a summary without findings.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the required property
  - the evidence
  - the example route
artifact_contract_verified_by: every finding names the property and the evidence and the route is marked as one example
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-plan-checker.md
status: active
revision: 1
---

# State the invariant the plan must satisfy, not the edit
`required_property` + `description` + `severity` are the binding payload: what must be true, the evidence it is not, and how hard that blocks.
`fix_hint` is **one example** of a route to that property — never the only admissible route, never an instruction.
State it as the invariant, not the edit — "every `auto` task has a `<verify>` separating pass from fail", not "add a verify block".
