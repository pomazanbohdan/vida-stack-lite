---
instruction_id: halt-instead-of-falling-back-to-the-stale-copy
title: Halt instead of falling back to the stale copy
summary: "When the declared source of truth cannot be resolved, the run stops; silently using the old copy would need the two to stay in sync forever."
capability_tags:
  - harden-validation
pattern_tags:
  - stop-on-conflict
conditions_applies_when: "The source of a task's content was declared as authoritative and could not be resolved."
conditions_does_not_apply_when: The content was resolved from the declared source.
artifact_contract_output_type: halt-report
artifact_contract_required_data:
  - the source that was declared
  - the reason it could not be resolved
artifact_contract_verified_by: the run stopped with the source and the reason named and no stale copy was used instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/develop-a-task-content-resolver-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Halt instead of falling back to the stale copy
with a hard-halt guarantee: if your tracker is declared as the source of truth and it fails to resolve, execution stops rather than silently falling back to stale `PLAN.md` text. That guarantee is the entire point of the feature — a silent fallback would require the tracker and `PLAN.md` to stay in sync forever, defeating the reason to move content out of `PLAN.md` in the first place.
