---
instruction_id: update-the-locked-spec-before-reopening-the-discussion
title: Update the locked spec before reopening the discussion
summary: "The specification is a one-way door: change it first, then re-run the discussion."
capability_tags:
  - clarify-requirements
pattern_tags:
  - living-specification
conditions_applies_when: A locked requirement has to change.
conditions_does_not_apply_when: The requirement was not locked yet.
artifact_contract_output_type: specification-update
artifact_contract_required_data:
  - the requirement that changed
  - the specification that now carries it
artifact_contract_verified_by: the specification carries the changed requirement before the discussion runs again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/spec.md
status: active
revision: 1
---

# Update the locked spec before reopening the discussion
**SPEC.md is a one-way door for requirements.** discuss-phase will treat these as locked. If requirements change after SPEC.md is written, the user should update SPEC.md first, then re-run discuss-phase.
