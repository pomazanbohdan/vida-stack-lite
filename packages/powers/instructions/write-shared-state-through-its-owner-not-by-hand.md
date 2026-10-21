---
instruction_id: write-shared-state-through-its-owner-not-by-hand
title: "Write shared state through its owner, not by hand"
summary: The shared state and roadmap are changed through their registered handlers; a direct write bypasses the safe update logic.
capability_tags:
  - harden-validation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A shared state or roadmap file has to be changed.
conditions_does_not_apply_when: The file is being created for the first time from its template.
artifact_contract_output_type: state-update
artifact_contract_required_data:
  - the handler that owns the change
artifact_contract_verified_by: the change went through the registered handler
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 1
---

# Write shared state through its owner, not by hand
No direct write to the shared state
Direct Write tool usage bypasses safe update logic and is unsafe in multi-session environments
