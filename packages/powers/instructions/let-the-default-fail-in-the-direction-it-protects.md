---
instruction_id: let-the-default-fail-in-the-direction-it-protects
title: Let the default fail in the direction it protects
summary: "The polarity of a guard follows what its default protects: a mistyped opt-in must not enable the behaviour the default exists to prevent."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A behaviour is switched on by a configuration value.
conditions_does_not_apply_when: The configuration value only changes a report.
artifact_contract_output_type: config-polarity
artifact_contract_required_data:
  - the value that opts in
  - the values that leave the default in place
  - what the default protects
artifact_contract_verified_by: a mistyped value leaves the conservative behaviour in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/opt-in-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the default fail in the direction it protects
Only the exact value `true` opts in — `"1"`, `"yes"` and `"TRUE"` all stay sequential, so a mistyped config gets the conservative behavior rather than concurrent requests at a rate-limited provider.
This polarity is deliberately the opposite of the `commit_docs` guard, which fails open: there, failing open preserves user intent; here it would fire the very requests the default exists to prevent.
A failure to read the config falls back to sequential too.
