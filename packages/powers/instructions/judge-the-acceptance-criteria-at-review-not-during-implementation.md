---
instruction_id: judge-the-acceptance-criteria-at-review-not-during-implementation
title: "Judge the acceptance criteria at review, not during implementation"
summary: Implementation verifies that the work runs; whether the acceptance criteria are met is decided in the review.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
  - testable-criteria
  - acceptance-criteria-timing-policy
conditions_applies_when: The implementation finished and the acceptance criteria are at hand.
conditions_does_not_apply_when: The work is in the review stage already.
artifact_contract_output_type: implementation-verification
artifact_contract_required_data:
  - the commands that were run
  - their outcomes
artifact_contract_verified_by: the implementation checked the run and left the acceptance criteria to the review
compatibility_excludes:
  - clear-the-acceptance-criteria-before-the-next-step
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 3
---

# Judge the acceptance criteria at review, not during implementation
Acceptance criteria are judged at review, not here.
