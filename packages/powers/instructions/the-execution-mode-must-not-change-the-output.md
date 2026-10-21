---
instruction_id: the-execution-mode-must-not-change-the-output
title: The execution mode must not change the output
summary: "Switching the vehicle the work runs in leaves the artifacts and the commits identical and the output layout the same, so nothing written under one mode has to be migrated to the other."
capability_tags:
  - define-output-format
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: The same work is about to run in a different execution mode or vehicle.
conditions_does_not_apply_when: The mode switch also changes what the work is supposed to produce.
artifact_contract_output_type: mode-comparison
artifact_contract_required_data:
  - the two modes
  - the artifacts and commits of each
artifact_contract_verified_by: the artifacts and the commits are identical and the layout is the same in both modes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-claude-orchestration-workflow-backend.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 1
---

# The execution mode must not change the output
the artifacts and commits it produces are identical — only the execution vehicle differs.
no artifact written under the parallel setting needs migrating, because the output layout is identical in both modes.
