---
instruction_id: write-a-handoff-a-fresh-instance-can-act-on
title: Write a handoff a fresh instance can act on
summary: "The handoff is specific enough for a fresh reader, explains why the decisions were made, and names the first action."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A session is about to be interrupted and work continues later.
conditions_does_not_apply_when: The session continues without interruption.
artifact_contract_output_type: handoff-note
artifact_contract_required_data:
  - the state reached
  - the decisions and their reasons
  - the first action to take
artifact_contract_verified_by: a fresh reader can take the first action from the note alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/continue-here.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write a handoff a fresh instance can act on
Be specific enough that a fresh Claude instance understands immediately
Include WHY decisions were made, not just what
The `<next_action>` should be actionable without reading anything else
