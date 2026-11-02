---
instruction_id: track-the-checklist-item-status-as-you-go
title: Track each replan step as you go
summary: "Work the replan in order, say which step is done and which remains, and keep running notes of what the tree could not answer."
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
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Track each replan step as you go
Work the replan in order: name the change; decide whether what is required changed; run `spec.md` or re-slice; drop what no longer belongs; record the reason.
After each step, say which step is done and which remains, and keep running notes of what the tree could not answer.
Do not present a separate checklist as the deliverable: the record is the ticket tree and its dated `Decision:` lines.
