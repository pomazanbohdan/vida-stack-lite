---
instruction_id: keep-each-increment-revertable
title: Keep each increment revertable
summary: "Every increment must be revertable on its own: additive where possible, minimal in its edits, and paired with a rollback for every migration."
capability_tags:
  - execute-plan
pattern_tags:
  - revertable-increments
conditions_applies_when: A change is about to be committed as one increment of a larger delivery.
conditions_does_not_apply_when: The change is already merged and cannot be taken back.
artifact_contract_output_type: revert-plan
artifact_contract_required_data:
  - how the increment is taken back
  - the rollback for each migration
artifact_contract_verified_by: the increment can be reverted without touching the increments around it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 1
---

# Keep each increment revertable

Each increment should be independently revertable:

- Additive changes (new files, new functions) are easy to revert
- Modifications to existing code should be minimal and focused
- Database migrations should have corresponding rollback migrations
- Avoid deleting something in one commit and replacing it in the same commit — separate them
