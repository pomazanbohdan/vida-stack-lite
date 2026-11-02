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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Suggest a few moves that fit, then stop
Give the block's link into the narrative, its content in that block's shape.
On block 1, list the moves in one line so the user knows the repertoire; past seven, name seven at random and say how many more there are.
On every block, suggest 1-3 moves that fit; when more fit than you will name, prefer ones not yet suggested in this review. Then stop. The named moves are not exhaustive; if something else is more obvious, suggest that instead.
The user may choose something you did not suggest, or just ask a question: answer it in this session with clickable references, without any formal review skill. Do what the user says. Stay with the current block until the user explicitly says it is done.
