---
instruction_id: authorize-scope-only-from-a-live-observation
title: Authorize scope only from a live observation
summary: "When the edit or verification scope depends on mutable state, it is authorized only by an observation made at planning time; historical notes may guide the search but never authorize a file."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A plan names the files it will edit or verify and the state behind that scope can change.
conditions_does_not_apply_when: The scope is a fixed list that cannot change between planning and execution.
artifact_contract_output_type: scope-authority
artifact_contract_required_data:
  - the live observation
  - the authorized scope
  - the condition when the scope is conditional
artifact_contract_verified_by: every authorized file comes from an observation made now and no historical path is listed as authorized
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick.md
status: active
revision: 1
---

# Authorize scope only from a live observation
when concrete edit or verification scope depends on mutable external state
authorize scope ONLY from a live observation made at planning time
or keep `files`/`verify` CONDITIONAL on that observation
may guide investigation only; they are never edit or verification authority
a plan must not enumerate them as authorized files
