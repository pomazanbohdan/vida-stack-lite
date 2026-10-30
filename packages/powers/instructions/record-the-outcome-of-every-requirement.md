---
instruction_id: record-the-outcome-of-every-requirement
title: Record the outcome of every requirement
summary: "A requirement that was validated, adjusted or dropped is recorded with that outcome; a box is ticked only for a requirement that was really met."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A set of requirements is closed out and the outcome of each one is known.
conditions_does_not_apply_when: The requirements are still open and no outcome has been reached.
artifact_contract_output_type: requirement-outcome-record
artifact_contract_required_data:
  - the outcome of every requirement
  - the requirements that were adjusted or dropped
artifact_contract_verified_by: every requirement carries its outcome and no adjusted or dropped requirement is recorded as met
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/complete-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-complete-milestone/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Record the outcome of every requirement
Mark all v1 requirements as complete (checkboxes checked)
Note requirement outcomes (validated, adjusted, dropped)
