---
instruction_id: skip-a-broken-extension-with-a-warning-instead-of-crashing-the-whole-set
title: Skip a broken extension with a warning instead of crashing the whole set
summary: An extension that cannot be loaded is skipped with a recorded warning and the rest of the set is processed; one broken extension never takes the others down.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: One extension in a set fails its validation or its load.
conditions_does_not_apply_when: Every extension in the set loads.
artifact_contract_output_type: skip-with-warning
artifact_contract_required_data:
  - the extension that was skipped
  - the warning that was recorded
  - the rest of the set
artifact_contract_verified_by: the broken extension was skipped with a warning and the rest of the set still loaded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-overlay-model.md
status: active
revision: 1
---

# Skip a broken extension with a warning instead of crashing the whole set
- the second rule of composition is: **a bad overlay is skipped with a warning; the loop always gets a usable registry.**
- The composition body is total: even an unexpected throw from a validator or a fragment-materialisation step is caught per-candidate, turned into a skip, and the next candidate is processed.
