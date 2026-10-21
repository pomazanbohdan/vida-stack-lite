---
instruction_id: treat-the-probe-rows-as-a-floor-not-a-ceiling
title: "Treat the probe rows as a floor, not a ceiling"
summary: "The rows a detector proposes are the floor that has to be resolved; the detector may have missed categories, so its rows are unioned with your own classification instead of narrowing it."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: A detector proposes rows that have to be resolved and the detector is known to be lossy.
conditions_does_not_apply_when: The detector is exhaustive.
artifact_contract_output_type: resolution-set
artifact_contract_required_data:
  - the proposed rows
  - the rows you added
  - the resolution of every row
artifact_contract_verified_by: every proposed row was resolved and no proposed row was dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Treat the probe rows as a floor, not a ceiling
Start from the edge-probe rows RENDERED above — the deterministic `items[]` are the FLOOR:
every proposed `(requirement_id, category)` MUST be resolved below
none silently dropped.
Then raise any applicable category the engine MISSED — the rows are a floor, never a ceiling:
Union the engine's rows with your own classification (relevance filter — see the taxonomy in the reference); do not narrow to them.
