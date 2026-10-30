---
instruction_id: commit-the-new-state-before-removing-the-old
title: Commit the new state before removing the old
summary: "The archives and the rewritten record are committed as a checkpoint before the originals are deleted, so the history can rebuild the tree if the next step fails."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - revertable-increments
conditions_applies_when: A record is rewritten and its original is about to be deleted.
conditions_does_not_apply_when: Nothing is deleted.
artifact_contract_output_type: safety-checkpoint
artifact_contract_required_data:
  - the checkpoint commit
  - the originals removed after it
artifact_contract_verified_by: the checkpoint commit exists before the removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Commit the new state before removing the old
Safety commit - commit archive files BEFORE deleting any originals:
Commit archives as a safety checkpoint before removing originals.
This creates a durable checkpoint in git history. If anything fails after this point, the working tree can be reconstructed from git.
