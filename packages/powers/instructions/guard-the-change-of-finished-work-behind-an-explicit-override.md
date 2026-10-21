---
instruction_id: guard-the-change-of-finished-work-behind-an-explicit-override
title: Guard the change of finished work behind an explicit override
summary: "Work that is in progress or finished is not changed without an explicit override, and the override is warned about."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: Work that is in progress or already completed is about to be changed.
conditions_does_not_apply_when: The work has not started yet.
artifact_contract_output_type: edit-request
artifact_contract_required_data:
  - the status of the work
  - the override that was passed
artifact_contract_verified_by: the change was refused without the override and warned about with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/edit-phase.md
status: active
revision: 1
---

# Guard the change of finished work behind an explicit override
If status is `in_progress` or `completed` AND `--force` was NOT passed:
Editing an in-progress or completed phase may invalidate executed plans.
Proceeding due to --force.
Don't edit in_progress/completed phases without --force
