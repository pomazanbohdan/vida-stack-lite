---
instruction_id: start-a-move-only-when-the-user-picks-it
title: Start a move only when the user picks it
summary: "The moves are a repertoire; one starts only when the reviewer picks it, and its outcome goes to the log."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A repertoire of moves is offered during a review.
conditions_does_not_apply_when: The reviewer has already chosen the move.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the picked move
  - the outcome of the move
artifact_contract_verified_by: the outcome of the move is in the log and the reviewer kept their place in the narrative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 1
---

# Start a move only when the user picks it
A repertoire the user may select from. Do not start a move unless the user picks it.
Record the outcome in the review log and keep their place in the review narrative.
