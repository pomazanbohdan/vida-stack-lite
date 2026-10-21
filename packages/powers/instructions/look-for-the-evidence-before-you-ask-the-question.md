---
instruction_id: look-for-the-evidence-before-you-ask-the-question
title: Look for the evidence before you ask the question
summary: "Settle what the repository and the planning context can settle, and turn only what is left into an open question on a finished design."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request arrives rough and something in it is unclear.
conditions_does_not_apply_when: The intent is already settled and the work is the implementation.
artifact_contract_output_type: evidence-backed-questions
artifact_contract_required_data:
  - the evidence found
  - the open question
  - the design it sits on
artifact_contract_verified_by: every open question is one the repository and the planning context could not settle
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
---

# Look for the evidence before you ask the question
The input can start rough; clear, evidence-supported requests proceed without a clarification turn.
When something is unclear, it looks for evidence first — only what the repository and planning context cannot settle becomes an open question on a finished design, not an interview before work starts.
It does not have to be tidy. A ramble, a voice dump, a half-formed thought, an issue link, a file, or a ticket from the tree all work — anything the model can turn into a concrete goal.
Answer open questions carefully when they appear.
A wrong call there is the most expensive kind of mistake to find later.
Scout the codebase BEFORE the first question — grounded questions only.
Grep the codebase for code/files relevant to this phase goal.
Confirm your current state synthesis internally. Do not present it to the user yet — you'll use it to ask precise, grounded questions.
