---
instruction_id: sequence-wide-refactors-expand-contract
title: Sequence wide refactors expand-contract
summary: "Sequence a wide refactor as expand, migrate in batches, then contract, keeping the build green at each step."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: One mechanical change has a blast radius too wide for a vertical slice.
conditions_does_not_apply_when: The change fits in one vertical slice.
artifact_contract_output_type: refactor-sequence
artifact_contract_required_data:
  - expand step
  - migrate batches
  - contract step
  - green check per step
artifact_contract_verified_by: the old form still exists during migration and is deleted only after the last caller
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/to-tickets/SKILL.md
status: active
revision: 1
---

# Sequence wide refactors expand-contract
A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**.
First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.
