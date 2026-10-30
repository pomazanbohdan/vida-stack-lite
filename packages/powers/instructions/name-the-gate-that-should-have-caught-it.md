---
instruction_id: name-the-gate-that-should-have-caught-it
title: Name the gate that should have caught it
summary: "The postmortem names the existing check that should have caught the class of bug; \"no gate existed\" is itself the finding."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: A resolved failure is written up.
conditions_does_not_apply_when: The failure was not a defect but a planned limitation.
artifact_contract_output_type: why-not-caught
artifact_contract_required_data:
  - the gate that should have caught it
  - why it did not
  - the reason no blame is assigned
artifact_contract_verified_by: "the gate is named, or the absence of a gate is stated as the finding"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-prevention.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Name the gate that should have caught it
Name the **existing gate** that should have caught this bug class and didn't — a test, a type check, a lint rule, code review, the verify step, the build.
If the honest answer is "no gate existed for this class," that itself is the finding (and the recurrence guard below is "add the gate").
Blame-free: treat "agent error" / "human error" as a prompt for *"why was that error possible?"* — not a terminal cause.
A postmortem that stops at "the engineer made a mistake" prevents nothing
Never assign blame to a person.
