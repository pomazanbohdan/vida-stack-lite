---
instruction_id: plan-the-migration-as-an-old-to-new-mapping
title: Plan the migration as an old to new mapping
summary: "A format change is planned as a table that maps every old thing to its new one, and nothing is deleted before the whole plan is approved."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - migration-strategy
  - approval-policy-gate
conditions_applies_when: An artefact has to be moved from one format to another.
conditions_does_not_apply_when: Nothing has to be moved; the artefact is written once.
artifact_contract_output_type: migration-plan
artifact_contract_required_data:
  - the old to new mapping
  - the parts that cannot be converted
  - the approval
artifact_contract_verified_by: the whole plan was approved before anything was deleted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/migrate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Plan the migration as an old to new mapping
Nothing is deleted before the user approves the whole plan.
Show it whole, as tables, then wait for a yes:
Cannot convert, listed plainly
with what it means for the user:
