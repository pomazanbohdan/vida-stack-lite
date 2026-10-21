---
instruction_id: capture-the-outgoing-value-before-the-state-flips
title: Capture the outgoing value before the state flips
summary: "The value that is about to be replaced is read and stored before the switch, and the stored value is read back rather than retyped by hand."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A state switch is about to replace a value that a later step still needs.
conditions_does_not_apply_when: The outgoing value is not needed after the switch.
artifact_contract_output_type: captured-outgoing-value
artifact_contract_required_data:
  - the captured value
  - the step that consumes it
artifact_contract_verified_by: the value was captured before the switch and read back rather than retyped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
status: active
revision: 1
---

# Capture the outgoing value before the state flips
Capture the outgoing version now.
current-milestone state no longer holds the outgoing version, which is why it is captured here.
do NOT transcribe the echoed value into a later command by hand.
