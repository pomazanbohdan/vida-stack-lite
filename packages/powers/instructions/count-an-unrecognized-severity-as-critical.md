---
instruction_id: count-an-unrecognized-severity-as-critical
title: Count an unrecognized severity as critical
summary: "An entry whose severity is missing or not one of the known levels is treated as the worst level, and an entry that is explicitly the lowest level stays advisory and never enters the loop."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A checker returned findings with severities that may be missing or unknown.
conditions_does_not_apply_when: Every finding carries one of the known severities.
artifact_contract_output_type: severity-count
artifact_contract_required_data:
  - the entries that must be fixed
  - the entries that are advisory
  - the entries with an unknown severity
artifact_contract_verified_by: an unknown severity counted as the worst level and the advisory entries stayed out of the loop
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 1
---

# Count an unrecognized severity as critical
Count the entries that must be fixed, treat an entry whose severity is missing or unrecognized as Critical (fail closed), and treat an entry explicitly marked Minor as advisory that never enters the loop.
