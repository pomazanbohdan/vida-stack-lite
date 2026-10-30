---
instruction_id: track-the-checklist-item-status-as-you-go
title: Track the checklist item status as you go
summary: "Work the checklist section by section with the owner, mark every item, keep running notes, and show the progress after each section."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A structured checklist is worked through item by item.
conditions_does_not_apply_when: The work is a single step with no checklist.
artifact_contract_output_type: checklist-progress
artifact_contract_required_data:
  - the section
  - the status of every item
  - the running notes
  - the progress shown
artifact_contract_verified_by: every item carries one of the three marks and the progress is shown after each section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Track the checklist item status as you go
Work through each section systematically with the user, recording findings and impacts
Record status for each checklist item:
[x] Done - Item completed successfully
[N/A] Skip - Item not applicable to this change
[!] Action-needed - Item requires attention or follow-up
Maintain running notes of findings and impacts discovered
Present checklist progress after each major section
