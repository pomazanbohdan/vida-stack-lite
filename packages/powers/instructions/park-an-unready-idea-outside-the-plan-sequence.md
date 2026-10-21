---
instruction_id: park-an-unready-idea-outside-the-plan-sequence
title: Park an unready idea outside the plan sequence
summary: "An idea that is not ready for planning waits in a parking lot outside the sequence: it is unsequenced, it carries no dependency field, and it accumulates context over time."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: An idea surfaces that is worth keeping but is not ready to be planned or sequenced.
conditions_does_not_apply_when: The idea is ready to be planned now and belongs in the plan sequence.
artifact_contract_output_type: parked-item
artifact_contract_required_data:
  - the parked item
  - why it is not ready
  - the number it was given
artifact_contract_verified_by: the parked item carries no dependency field and sits outside the active sequence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-backlog.md
status: active
revision: 1
---

# Park an unready idea outside the plan sequence
Backlog items are unsequenced ideas that aren't ready for active planning - they live outside the normal phase sequence and accumulate context over time.
No `Depends on:` field - backlog items are unsequenced by definition
Never guess the number.
