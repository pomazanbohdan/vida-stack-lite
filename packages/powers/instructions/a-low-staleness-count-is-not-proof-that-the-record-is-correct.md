---
instruction_id: a-low-staleness-count-is-not-proof-that-the-record-is-correct
title: A low staleness count is not proof that the record is correct
summary: A high count says the record is worth re-reading; a low count says only that something wrote it recently.
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A freshness marker reports how far behind the record is.
conditions_does_not_apply_when: The record is being checked against the current state directly.
artifact_contract_output_type: freshness-marker
artifact_contract_required_data:
  - the count
  - what the count does and does not support
artifact_contract_verified_by: the count is read as a prompt to look and not as a measurement of correctness
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/read-the-statusline-freshness-marker.md
status: active
revision: 1
---

# A low staleness count is not proof that the record is correct
**A high count** is a reliable signal that the state file is worth re-reading.
**A low count** is not evidence that the state file is correct.
Do not build automation on it. It is a proxy, deliberately rendered with a `~`.
