---
instruction_id: complete-only-what-is-verified-complete
title: Complete only what is verified complete
summary: Only the item that merged and passed is marked done; every other item keeps the status its own step gave it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A batch item is about to be marked complete.
conditions_does_not_apply_when: The item already carries its final status.
artifact_contract_output_type: completion-record
artifact_contract_required_data:
  - the item that was completed
  - the items that were left in their routed state
artifact_contract_verified_by: only the verified item carries the completion and the others kept their status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/completion.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Complete only what is verified complete
and the item's complete status; both happen inside ONE lock transaction, exactly once per item
are left exactly as their respective routing step set them.
worktree preserved where applicable.
never completes the item
fails it without rollback or retry
