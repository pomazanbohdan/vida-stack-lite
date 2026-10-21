---
instruction_id: give-test-first-work-its-own-plan-and-a-smaller-context-budget
title: Give test-first work its own plan and a smaller context budget
summary: "One feature per test-first plan, and that plan gets a smaller context budget because the cycle is heavier."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: A feature is developed test-first.
conditions_does_not_apply_when: The change is trivial enough to batch with others.
artifact_contract_output_type: test-first-plan
artifact_contract_required_data:
  - the feature
  - the context budget of the plan
artifact_contract_verified_by: the plan carries one feature and the smaller context budget
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/tdd.md
status: active
revision: 1
---

# Give test-first work its own plan and a smaller context budget
TDD work is fundamentally heavier than standard tasks—it requires 2-3 execution cycles (RED → GREEN → REFACTOR), each with file reads, test runs, and potential debugging. TDD features get dedicated plans to ensure full context is available throughout the cycle
**One feature per TDD plan.** If features are trivial enough to batch, they're trivial enough to skip TDD—use a standard plan and add tests after
TDD plans target **~40% context usage** (lower than standard plans' ~50%)
