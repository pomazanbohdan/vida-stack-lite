---
instruction_id: plan-the-whole-epic-not-only-the-next-story
title: "Plan the whole container, not only the next item"
summary: "Plan the entire container, and put every unknown that must be settled before implementation to the user instead of guessing the design of work that depends on it."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A container is being planned.
conditions_does_not_apply_when: The plan for the container already exists and is being executed.
artifact_contract_output_type: container-plan
artifact_contract_required_data:
  - "the whole container's plan"
  - the unknowns put to the user
  - the spike added for an unknown
artifact_contract_verified_by: the plan covers the whole container and no unknown is answered by a guess
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Plan the whole container, not only the next item
The epic is ready to be worked and its spec exists or the user chose to go without. Read its breakdown, every child ticket, and their results before proposing changes. Plan the entire epic, not only its next story.
Put each unknown that must be settled before implementation to the user: answer it now, record it as the `unknown` of the entries it affects, or add a spike when they ask for one. Never guess the design of work that depends on it.
