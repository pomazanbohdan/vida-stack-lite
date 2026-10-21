---
instruction_id: normalize-a-noisy-trail-to-a-fixed-vocabulary
title: Normalize a noisy trail to a fixed vocabulary
summary: "A raw signal is mapped onto a closed set of values; anything absent, unrecognised or ambiguous becomes the explicit missing value and is still listed."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A raw record carries a value that has to be reported in a fixed vocabulary.
conditions_does_not_apply_when: The value is already one of the permitted values and is unambiguous.
artifact_contract_output_type: normalized-trail
artifact_contract_required_data:
  - the record
  - the normalized value
  - the entries that carry no value
artifact_contract_verified_by: every record carries exactly one of the permitted values and no record is dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 1
---

# Normalize a noisy trail to a fixed vocabulary
Surface each commit's `gate-status:` value, normalized to exactly one of `skill`, `fallback`, `exempt`, or `missing` — never the raw trailer text.
A commit whose trailer is absent, whose value is none of the first three, or which carries more than one `gate-status:` trailer (ambiguous) is counted as **missing** and still listed.
This section is informational; it never blocks the ship.
