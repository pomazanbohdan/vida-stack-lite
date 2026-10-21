---
instruction_id: let-only-the-owner-write-the-slot
title: Let only the owner write the slot
summary: A block that carries the state of a gate is written by its owner alone; every other agent reads it and leaves it byte for byte.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Another agent can write the artifact that holds a gate block.
conditions_does_not_apply_when: You are the owner of the block.
artifact_contract_output_type: owned-slot
artifact_contract_required_data:
  - the owner of the block
  - the block as it was read
artifact_contract_verified_by: the block was read unchanged and only its owner wrote into it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Let only the owner write the slot
Appending, editing, reordering or deleting a line there forges the state of a blocking gate.
Readers read.
Only the owner writes into the block.
