---
instruction_id: ask-what-runtime-state-still-holds-the-old-name
title: Ask what runtime state still holds the old name
summary: "After the files are renamed, the state that was already stored, registered or built still carries the old name and has to be found."
capability_tags:
  - migrate-a-data-schema
pattern_tags:
  - migration-strategy
conditions_applies_when: "A rename, a rebrand, a refactor or a migration is planned."
conditions_does_not_apply_when: Nothing is renamed and nothing moves.
artifact_contract_output_type: runtime-state-inventory
artifact_contract_required_data:
  - the categories checked
  - the items found
  - the action per item
artifact_contract_verified_by: "every category was answered, including the ones with nothing in them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Ask what runtime state still holds the old name
The canonical question: *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*
A grep audit finds files. It does NOT find runtime state.
If the answer for a category is "nothing" — say so explicitly. Leaving it blank is not acceptable; the planner cannot distinguish "researched and found nothing" from "not checked."
whether it requires a **data migration** (update existing records) vs. a **code edit** (change how new records are written). These are different tasks and must both appear in the plan.
