---
instruction_id: escalate-the-implementation-bug-instead-of-fixing-it
title: Escalate the implementation bug instead of fixing it
summary: "A validation pass writes tests and the validation record; a defect it finds in the implementation is escalated, not silently repaired."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A validation pass over existing work finds a defect in the implementation.
conditions_does_not_apply_when: The pass owns the implementation it validates.
artifact_contract_output_type: validation-escalation
artifact_contract_required_data:
  - the requirement that lacks automated verification
  - the defect found in the implementation
  - the escalation that carries it to a person
artifact_contract_verified_by: no implementation code was changed and every defect found was escalated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/nyquist-validation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Escalate the implementation bug instead of fixing it
Never modifies implementation code — only test files and VALIDATION.md
Flags implementation bugs as escalations for user to address
Identifies gaps where requirements lack automated verification
Spawns auditor to generate tests (max 3 attempts)
