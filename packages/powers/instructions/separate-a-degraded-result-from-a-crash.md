---
instruction_id: separate-a-degraded-result-from-a-crash
title: Separate a degraded result from a crash
summary: "A run that completed and reported a condition is a degraded result; only a run that broke is a crash, and the two are never mapped onto the same code."
capability_tags:
  - triage-reports
pattern_tags:
  - graceful-degradation
conditions_applies_when: A result carries a condition that the run diagnosed on purpose.
conditions_does_not_apply_when: The run itself broke.
artifact_contract_output_type: outcome-classification
artifact_contract_required_data:
  - the outcome class
  - the condition that was reported
artifact_contract_verified_by: the diagnosed condition is classified as a degraded result and not as a crash
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/adopt-the-v2-exit-contract.md
status: active
revision: 1
---

# Separate a degraded result from a crash
`80` is **not** a crash. The process did its job: it determined, correctly, that the artifact you asked about is absent, unparseable, or that a required argument was missing
Do not conflate the two: a gate that maps `80` to "the tool is broken" will page someone for a condition the tool successfully diagnosed.
