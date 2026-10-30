---
instruction_id: choose-test-first-only-where-the-behaviour-can-be-stated-up-front
title: Choose test first only where the behaviour can be stated up front
summary: Test-first is chosen when the behaviour can be written as an expectation before the code exists; otherwise it is added after.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-placement-strategy
conditions_applies_when: The way to build a change is being chosen.
conditions_does_not_apply_when: The behaviour is already stated as an expectation.
artifact_contract_output_type: test-first-decision
artifact_contract_required_data:
  - the expectation that could be written
  - the decision taken
artifact_contract_verified_by: the decision names the expectation or the reason no expectation could be written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/tdd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose test first only where the behaviour can be stated up front
**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
**Skip TDD (use standard plan with `type="auto"` tasks):**
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic
- Exploratory prototyping
