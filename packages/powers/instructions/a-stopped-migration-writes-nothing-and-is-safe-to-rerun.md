---
instruction_id: a-stopped-migration-writes-nothing-and-is-safe-to-rerun
title: A stopped migration writes nothing and is safe to re-run
summary: "Conflict detection runs before any write: a migration that finds a contradiction stops, writes nothing, and can be re-run once the contradiction is resolved."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - revertable-increments
conditions_applies_when: A migration is about to be run over content that may contradict what is already there.
conditions_does_not_apply_when: The target is empty.
artifact_contract_output_type: migration-halt
artifact_contract_required_data:
  - the conflicts found
  - what was written
  - what to do before re-running
artifact_contract_verified_by: nothing was written and the migration can be re-run after the conflict is resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/migrate-from-gsd-2.md
status: active
revision: 1
---

# A stopped migration writes nothing and is safe to re-run
it prints a conflict report and stops without writing any files.
The migration is safe to re-run until it passes cleanly.
