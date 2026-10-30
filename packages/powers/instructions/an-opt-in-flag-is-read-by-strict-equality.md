---
instruction_id: an-opt-in-flag-is-read-by-strict-equality
title: An opt-in flag is read by strict equality
summary: "Only the exact value opts in; every near-miss spelling is read as not enabled, so a mistyped configuration gets the conservative behaviour."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A behaviour is switched on by a configuration value.
conditions_does_not_apply_when: The value is a free-form setting that is validated against a schema.
artifact_contract_output_type: flag-read-result
artifact_contract_required_data:
  - the exact value that opts in
  - the values that do not
  - the behaviour that follows
artifact_contract_verified_by: only the exact value enables the behaviour and every near miss leaves it off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An opt-in flag is read by strict equality
Only the exact value `true` opts in. `"1"`, `"yes"`, `"on"` and `"TRUE"` are all read as *not enabled* and leave dispatch sequential. This is intentional: a mistyped config gets the conservative behavior rather than firing concurrent requests at a rate-limited provider.
