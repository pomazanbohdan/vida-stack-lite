---
instruction_id: a-mode-switch-does-not-migrate-what-was-already-written
title: A mode switch does not migrate what was already written
summary: "Switching the mode changes how new work resolves; it does not retro-migrate what was already recorded, and the backfill is a separate concern."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - expand-contract
conditions_applies_when: A setting that decides how new records are resolved is changed on a project that already holds records.
conditions_does_not_apply_when: No record was written under the earlier mode.
artifact_contract_output_type: migration-scope
artifact_contract_required_data:
  - the mode before and after
  - what the switch covers
  - what it does not cover
artifact_contract_verified_by: "the switch is described as covering new records only, and the backfill is named as separate work"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-cross-session-memory-with-mempalace.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# A mode switch does not migrate what was already written
changes how *new* recall and capture resolve; it does **not** retro-migrate memory already written
Backfilling existing native memory into the palace is a separate, not-yet-implemented concern
