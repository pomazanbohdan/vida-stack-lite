---
instruction_id: review-changes-the-intent-and-not-the-state
title: Review the intent and leave the state alone
summary: "A review reads the item, its source and the finished siblings, improves the description, the check, the references and the notes with the user, and sets no status and no refinement flag."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing work item is reviewed with the user before the build starts.
conditions_does_not_apply_when: The item is being refined to full criteria before it starts.
artifact_contract_output_type: review-record
artifact_contract_required_data:
  - "the item, its source and the finished siblings"
  - the changes made with the user
  - the state left untouched
artifact_contract_verified_by: the review changed the intent and no status and no refinement flag
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Review the intent and leave the state alone
Read the file, its source, and the finished siblings and their plans.
With the user, improve the description, `Verify:`, references, and notes; adjust order and prerequisites, and run the set check in `validate.md` on the revised draft when they change.
A review sets neither `status` nor `refined`: the file is intent that is ready for the build
