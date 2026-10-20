---
instruction_id: write-acceptance-criteria-as-given-when-then
title: Write acceptance criteria as Given/When/Then
summary: Each acceptance criterion is a Given/When/Then condition the implementer can prove without pointing at the code.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for the plan.
conditions_does_not_apply_when: The work has no acceptance criteria.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the precondition
  - the action
  - the expected result
artifact_contract_verified_by: each criterion is a condition the implementer can settle on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 1
---

# Write acceptance criteria as Given/When/Then
Given PRECONDITION, when ACTION, then EXPECTED_RESULT
**Testable**: All ACs use Given/When/Then, and each is a check the implementer can prove it met without pointing at code.
