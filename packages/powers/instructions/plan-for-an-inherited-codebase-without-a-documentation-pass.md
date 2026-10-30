---
instruction_id: plan-for-an-inherited-codebase-without-a-documentation-pass
title: Plan for an inherited codebase without a documentation pass
summary: "An inherited codebase needs no up-front documentation pass: too little planning costs one build run, so start with something one session can finish and let the rules file record what the agents must not get wrong."
capability_tags:
  - audit-codebase
pattern_tags:
  - project-conventions-first
conditions_applies_when: The work meets a codebase nobody documented for the agents.
conditions_does_not_apply_when: The codebase already carries a verified set of rules for agents.
artifact_contract_output_type: adoption-plan
artifact_contract_required_data:
  - what the code already does
  - what to reuse
  - what not to change
artifact_contract_verified_by: the first change is small enough to finish in one session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/existing-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Plan for an inherited codebase without a documentation pass
works on an inherited or long-lived codebase with no up-front documentation pass.
Too little planning costs one build run, so start small and add planning only when the work calls for it.
Pick something one session can finish.
A change that follows established patterns, such as a new route in a layered API, needs no planning skill: a short intent file or a few sentences is enough input.
A good initial `AGENTS.md` is worth having: it records a small, verified set of rules for agents.
Skipping it does not fail a build; the cost is the same mistake every session until someone writes the rule down.
