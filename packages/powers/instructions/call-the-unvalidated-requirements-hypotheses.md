---
instruction_id: call-the-unvalidated-requirements-hypotheses
title: Call the unvalidated requirements hypotheses
summary: A requirement that has not shipped and been validated is a hypothesis; the validated set is what the existing code already does.
capability_tags:
  - clarify-requirements
pattern_tags:
  - living-specification
conditions_applies_when: Requirements are recorded for a body of work that is not shipped yet.
conditions_does_not_apply_when: The requirements were already validated in an earlier run.
artifact_contract_output_type: requirement-status
artifact_contract_required_data:
  - the validated set
  - the hypotheses
  - the source of each validated item
artifact_contract_verified_by: no unshipped requirement is presented as validated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 1
---

# Call the unvalidated requirements hypotheses
All Active requirements are hypotheses until shipped and validated.
Infer Validated requirements from existing code:
Identify what the codebase already does
These become the initial Validated set
Not shipped: not validated.
