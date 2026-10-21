---
instruction_id: write-the-unknown-value-instead-of-omitting-the-key
title: Write the unknown value instead of omitting the key
summary: "When a value cannot be recovered it is written as the explicit unknown, because an omitted key cannot be told apart from the feature never having run."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A record is written with one entry per participant and a value may be missing.
conditions_does_not_apply_when: Every value is known.
artifact_contract_output_type: record-with-unknowns
artifact_contract_required_data:
  - the entries
  - the unknown values
artifact_contract_verified_by: the key sets match and the unknown is written rather than left out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 1
---

# Write the unknown value instead of omitting the key
Write the literal `unknown` rather than omitting a key
an omitted key is indistinguishable from the feature not having run
a reader must be able to tell *no model recorded* from *nothing to look at*
