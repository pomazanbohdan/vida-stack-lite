---
instruction_id: answer-the-question-before-recommending-a-route
title: Answer the question before recommending a route
summary: "The answer comes first; the route and its reason follow, and an unanswered question is said to be unanswered rather than guessed."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: You answer a question and could also point at a tool or a procedure that would answer it.
conditions_does_not_apply_when: The question is which procedure to use.
artifact_contract_output_type: answer-with-route
artifact_contract_required_data:
  - the answer
  - the recommended route
  - the reason for the route
artifact_contract_verified_by: "the answer is stated before the route, and an unresolved question is declared unresolved"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/references/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Answer the question before recommending a route
Answer the question first. Recommend only installed skills, with the reason the module help gives; take routes and order only from the module help.

When the help does not settle the question, go deeper in this order and stop when it does: the file in `topics` for that subject, the skill's own files, then the remote documentation the module help names. If nothing answers it, say so rather than guess.
