---
instruction_id: take-the-sufficient-option-in-order
title: Take the sufficient option in order
summary: The options are tried in a fixed order and the first demonstrably sufficient one is taken — without shrinking the requested scope.
capability_tags:
  - plan-implementation
pattern_tags:
  - code-minimization
conditions_applies_when: Several ways of implementing the task are available.
conditions_does_not_apply_when: The task is already fixed by a locked decision.
artifact_contract_output_type: sufficiency-order
artifact_contract_required_data:
  - the rung taken
  - why the earlier rungs did not suffice
artifact_contract_verified_by: the option taken is the first sufficient one and the requested scope is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Take the sufficient option in order
After preserving locked user decisions and complete requirement coverage, choose the first option that is demonstrably sufficient for the task's `<done>` condition:
1. Existing project behavior, helper, or established pattern
2. Standard-library capability
3. Native platform capability
4. Already-installed dependency
5. Minimum new implementation
This ordering is a sufficiency check, not permission to make the task smaller. It must never reduce requested scope or override locked user decisions, requirement coverage, security, validation, accessibility, error handling, or verification
