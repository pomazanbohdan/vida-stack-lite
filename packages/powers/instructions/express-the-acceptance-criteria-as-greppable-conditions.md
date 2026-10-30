---
instruction_id: express-the-acceptance-criteria-as-greppable-conditions
title: Express the acceptance criteria as greppable conditions
summary: An acceptance criterion is written as a condition that a command or a search can check; subjective wording is not a criterion.
capability_tags:
  - write-tests-first
pattern_tags:
  - testable-criteria
conditions_applies_when: The acceptance criteria of a task are being written.
conditions_does_not_apply_when: The criterion can only be judged by a person looking at the result.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the conditions that are written
  - the way each one is checked
  - the subjective wording that is refused
artifact_contract_verified_by: every criterion is checkable by a command or a search
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Express the acceptance criteria as greppable conditions
- Verifiable conditions: grep-verifiable strings, command exit codes, observable behaviours. No subjective language ("looks correct", "properly configured").
