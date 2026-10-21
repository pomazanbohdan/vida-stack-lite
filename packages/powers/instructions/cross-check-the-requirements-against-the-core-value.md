---
instruction_id: cross-check-the-requirements-against-the-core-value
title: Cross-check the requirements against the core value
summary: "The gathered requirements are checked against the one thing that has to work, and any gap between them is surfaced instead of being left in the document."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A set of requirements has just been written down and the core value is known.
conditions_does_not_apply_when: There is no core value to check against.
artifact_contract_output_type: core-value-gap-report
artifact_contract_required_data:
  - the core value
  - the gaps found
artifact_contract_verified_by: every gap between the requirements and the core value was surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 1
---

# Cross-check the requirements against the core value
Cross-check requirements against Core Value from
If gaps detected, surface them.
Core value (the ONE thing that must work)
Stated constraints (budget, timeline, tech limitations)
