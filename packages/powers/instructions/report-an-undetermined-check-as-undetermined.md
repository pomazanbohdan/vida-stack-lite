---
instruction_id: report-an-undetermined-check-as-undetermined
title: Report an undetermined check as undetermined
summary: "A check that failed or returned nothing is reported as undetermined — never read as a negative answer, and never silently read as \"not protected\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A check, query or guard was run and it did not produce an answer."
conditions_does_not_apply_when: The check ran and produced an answer.
artifact_contract_output_type: undetermined-check-report
artifact_contract_required_data:
  - the check that was run
  - the failure or the absence of an answer
  - the reported state
artifact_contract_verified_by: the report says the state is undetermined and does not state it as false
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/protected-branch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/health.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report an undetermined check as undetermined
A failed query is **not** a capability verdict.
Track the two apart and report which one happened.
degrades **visibly** (an explicit "could not determine" warning) rather than silently reading as "not protected"
Present the error verbatim and stop — never read it as "no status".
means the scope could not be resolved, which is a failed self-check, never "no commits yet"
Exit 69 (UNAVAILABLE) is "could not look", not "no files changed": say so rather than print nothing.
