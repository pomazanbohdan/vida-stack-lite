---
instruction_id: verify-each-migration-before-the-next
title: Verify each migration before the next one
summary: "Migrations run one at a time, each verified before the next, and a migration that was not applicable before can become applicable after the one that just ran."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - migration-strategy
conditions_applies_when: A project has to be migrated through several versions.
conditions_does_not_apply_when: A single change updates the project.
artifact_contract_output_type: migration-run
artifact_contract_required_data:
  - the migrations and their order
  - the verification result of each
artifact_contract_verified_by: "each migration is verified before the next one starts, and the later migrations are re-checked after each"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/references/migrate.md
status: active
revision: 1
---

# Verify each migration before the next one
Several migrations chosen, of one module or several: run them one at a time in that order, each verified before the next. After each one, check the `detect` of that module's later migrations again, since the one just run can make them apply, and offer any that now match.
