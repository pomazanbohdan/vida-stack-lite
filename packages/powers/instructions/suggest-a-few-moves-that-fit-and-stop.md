---
instruction_id: suggest-a-few-moves-that-fit-and-stop
title: "Suggest a few moves that fit, then stop"
summary: "Offer a short list of moves that fit, then stop and let the reviewer pick."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A block is up for review and the reviewer has to choose what happens next.
conditions_does_not_apply_when: The reviewer has already named the move they want.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the moves that fit
  - the block they belong to
artifact_contract_verified_by: one to three moves are offered and the turn ends after the offer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 1
---

# Suggest a few moves that fit, then stop
Give the block's link into the narrative, its content in that block's shape.
Suggest 1-3 moves that fit. Then stop. The named moves are not exhaustive; if something else is more obvious, suggest that instead.
The user may choose something you did not suggest. Do what the user says. Stay with the current block until the user explicitly says it is done.
