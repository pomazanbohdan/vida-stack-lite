---
instruction_id: ask-only-what-is-unsettled-and-offer-a-default
title: Ask only what is unsettled and offer a default
summary: "A work item starts from what is known: what exists when it is done, how it will be verified, what must not change and what is already decided; only the rest is asked, each with a default."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A work item is being drafted from what is known so far.
conditions_does_not_apply_when: The requirements and the decisions are already written down.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - what is already known
  - the questions that remain
  - the default offered for each
artifact_contract_verified_by: every question left open carries a default that produces a working item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 1
---

# Ask only what is unsettled and offer a default
A ticket starts from what is known: what exists when it is done, how it will be verified, what must not change, and what is already decided.
Ask only what remains unsettled, offering a default for each, then draft into the ticket tree.
