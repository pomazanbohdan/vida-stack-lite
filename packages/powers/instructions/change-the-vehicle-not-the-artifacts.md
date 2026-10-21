---
instruction_id: change-the-vehicle-not-the-artifacts
title: "Change the vehicle, not the artifacts"
summary: Replacing the mechanism that carries out the work leaves the artifacts it produces and the commits it makes identical; only the vehicle changes.
capability_tags:
  - design-structure
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A second mechanism is introduced to carry out work that already has one.
conditions_does_not_apply_when: The work has no existing mechanism to preserve.
artifact_contract_output_type: same-artifacts-new-vehicle
artifact_contract_required_data:
  - the mechanism before and after
  - the artifacts that must stay identical
  - what is allowed to differ
artifact_contract_verified_by: the artifacts and the commits are identical and only the vehicle differs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 1
---

# Change the vehicle, not the artifacts
- it produces the same `SUMMARY.md` artifacts and commits — the only difference is the execution vehicle.
