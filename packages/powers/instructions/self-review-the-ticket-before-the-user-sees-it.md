---
instruction_id: self-review-the-ticket-before-the-user-sees-it
title: Self-review the item before the user sees it
summary: "Read the drafted item back at its own level of detail, check its size, wording, references and source consistency, fix what is found, and say what changed in the user's intent."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A drafted work item is about to be shown to the user.
conditions_does_not_apply_when: The item was already reviewed and approved.
artifact_contract_output_type: self-review-record
artifact_contract_required_data:
  - the level of detail read back
  - "size, wording, references and source consistency"
  - the fixes made
artifact_contract_verified_by: the item was read back at its own level of detail and what was found was fixed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 1
---

# Self-review the item before the user sees it
Read it back at its current level of detail: an entry needs its description and verification approach; a refined ticket needs runnable acceptance criteria and settled prerequisites.
Check size (one agent session plans and finishes it), wording, references, and source consistency.
Fix what you find; mention changes to the user's intent.
