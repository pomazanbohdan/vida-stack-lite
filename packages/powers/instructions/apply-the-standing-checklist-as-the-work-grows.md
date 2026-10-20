---
instruction_id: apply-the-standing-checklist-as-the-work-grows
title: Apply the standing checklist as the work grows
summary: "The checklist is applied in stages: correctness and quality per task, integration and documentation per feature, the whole list per release."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: "A task, a feature or a release is being signed off."
conditions_does_not_apply_when: The project has no standing checklist of its own.
artifact_contract_output_type: checklist-application-record
artifact_contract_required_data:
  - the stage the work has reached
  - the sections that apply at this stage
  - the sections still outstanding
artifact_contract_verified_by: every section that applies at the current stage is confirmed before the work is signed off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
status: active
revision: 1
---

# Apply the standing checklist as the work grows
Apply this to every change before declaring it done.
Per task: confirm the Correctness and Quality sections before checking the task off.
Per feature: confirm Integration and Documentation before considering the feature complete.
Per release: the full checklist is the floor; the release process adds the deploy-specific gates on top.
