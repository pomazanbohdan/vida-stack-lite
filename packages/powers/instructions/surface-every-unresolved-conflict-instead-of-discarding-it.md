---
instruction_id: surface-every-unresolved-conflict-instead-of-discarding-it
title: Surface every unresolved conflict instead of discarding it
summary: Only the strongest class of contradiction stops the run; every other conflict is surfaced for review rather than silently discarded.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An import or a merge produces contradictions between the sources it reads.
conditions_does_not_apply_when: No contradiction was found.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the buckets
  - the contradictions
  - which ones stop the run
artifact_contract_verified_by: every unresolved contradiction appears in the report and only the strongest class hard-stops
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/migrate-from-gsd-2.md
status: active
revision: 1
---

# Surface every unresolved conflict instead of discarding it
Hard-stops only occur on LOCKED-vs-LOCKED ADR contradictions; everything else is surfaced for your review, not silently discarded.
