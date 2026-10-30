---
instruction_id: fail-closed-when-the-revert-window-cannot-be-bounded
title: Fail closed when the revert window cannot be bounded
summary: "When the range of commits to revert cannot be pinned down, or when it resolves to an ambiguous place, the rollback stops with its own message; a repository-wide search is never the fallback."
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A rollback selects commits by a window that has to be resolved first.
conditions_does_not_apply_when: The window is given explicitly by the caller.
artifact_contract_output_type: window-refusal
artifact_contract_required_data:
  - the unresolved or ambiguous window
  - the reason it is refused
  - the explicit route that replaces it
artifact_contract_verified_by: the rollback stopped with a specific refusal instead of widening its selection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail closed when the revert window cannot be bounded
**Fail closed when no anchor resolves.** If `UNDO_RANGE` is empty, stop:
An unbounded repository-wide search is never the fallback — that is the defect this anchor replaces.
**Refuse an ARCHIVED resolution — it selects the wrong milestone, not merely too few commits.**
If `PHASE_DIR_ARCHIVED` is non-empty, stop — this message, not the not-found one:
If `PHASE_DIR_FOREIGN` is non-empty, stop with its own message:
And if `PHASE_DIR_REUSED` is non-empty, stop with its own message:
Exit cleanly in every case.
