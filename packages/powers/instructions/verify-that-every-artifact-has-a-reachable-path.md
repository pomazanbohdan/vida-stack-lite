---
instruction_id: verify-that-every-artifact-has-a-reachable-path
title: Verify that every artifact has a reachable path
summary: "Every artifact a plan promises is traced to the path that creates it, the action that triggers it or the flag that reads it."
capability_tags:
  - plan-implementation
pattern_tags:
  - verification-harness
conditions_applies_when: A plan promises artifacts.
conditions_does_not_apply_when: The plan promises nothing beyond the tasks.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the artifact
  - its path
artifact_contract_verified_by: no artifact without a path survives the check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Verify that every artifact has a reachable path
For each must-have artifact, verify a concrete path exists:
Entity → in-phase or existing creation path
Workflow → user action or API call triggers it
Config flag → default value + consumer
UI → route or nav link
UNREACHABLE (no path) → revise plan.
