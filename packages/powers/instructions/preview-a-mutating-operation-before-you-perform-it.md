---
instruction_id: preview-a-mutating-operation-before-you-perform-it
title: Preview a mutating operation before you perform it
summary: "A mutating operation previews by default, writes only when it is told to, always prints what it would do, and replaces each unit as a whole."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: An operation changes files outside the current directory.
conditions_does_not_apply_when: The operation is read-only.
artifact_contract_output_type: mutation-preview
artifact_contract_required_data:
  - the preview
  - the list of changes
  - the flag that applies them
artifact_contract_verified_by: the preview was printed before anything was written and a repeated run reports no change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sync-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Preview a mutating operation before you perform it
If neither `--dry-run` nor `--apply` is specified, dry-run is the default.
**Dry-run is the default.** `--apply` must be passed explicitly to write anything.
Always print the report, regardless of `--apply` or `--dry-run`:
**Atomicity:** Each skill directory is replaced as a unit (remove then copy). Partial updates of individual files within a skill are not performed — the whole directory is replaced.
**Idempotency:** Running `--apply` a second time with no intervening changes must report zero changes (all entries are SKIP).
