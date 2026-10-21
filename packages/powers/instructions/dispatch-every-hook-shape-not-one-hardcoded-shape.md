---
instruction_id: dispatch-every-hook-shape-not-one-hardcoded-shape
title: "Dispatch every hook shape, not one hardcoded shape"
summary: A dispatcher that hand-rolls a single entry shape silently drops every other shape registered at that point.
capability_tags:
  - execute-plan
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A point in a workflow dispatches the entries registered for it.
conditions_does_not_apply_when: The point has exactly one registered shape and no others can appear.
artifact_contract_output_type: dispatch-coverage
artifact_contract_required_data:
  - the registered entry shapes
  - the shape that was dispatched
  - the shapes that were skipped
artifact_contract_verified_by: "every registered shape was dispatched, not only the hardcoded one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 1
---

# Dispatch every hook shape, not one hardcoded shape
A point whose workflow hand-rolls one `kind` does not implement this contract
Dispatches every active `step` entry, not one shape of one
