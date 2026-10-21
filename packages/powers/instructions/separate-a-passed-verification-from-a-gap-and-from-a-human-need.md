---
instruction_id: separate-a-passed-verification-from-a-gap-and-from-a-human-need
title: Separate a passed verification from a gap and from a human need
summary: "The report states whether the goal was reached, whether critical gaps were found, or whether a human is still needed."
capability_tags:
  - verify-work-results
pattern_tags:
  - report-triage
conditions_applies_when: A verification report is written.
conditions_does_not_apply_when: The report is a single verdict with no states.
artifact_contract_output_type: verification-status
artifact_contract_required_data:
  - the status
  - the criteria that decide it
artifact_contract_verified_by: the status is one of the three named states and the criteria for it are stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/verification-report.md
status: active
revision: 1
---

# Separate a passed verification from a gap and from a human need
`passed` — All must-haves verified, no blockers
`gaps_found` — One or more critical gaps found
`human_needed` — Automated checks pass but human verification required
