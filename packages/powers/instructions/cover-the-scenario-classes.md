---
instruction_id: cover-the-scenario-classes
title: Cover the scenario classes
summary: "For every unit under test, cover the happy path, the empty input, the boundaries, the error paths and the concurrency case."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test suite is being designed for a function or a component.
conditions_does_not_apply_when: The unit under test has no inputs and no failure modes.
artifact_contract_output_type: scenario-coverage
artifact_contract_required_data:
  - unit under test
  - scenario classes covered
  - scenario classes still missing
artifact_contract_verified_by: every scenario class has a case or is recorded as not applicable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/test-engineer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 2
---

# Cover the scenario classes
For every function or component:

| Scenario | Example |
|----------|---------|
| Happy path | Valid input produces expected output |
| Empty input | Empty string, empty array, null, undefined |
| Boundary values | Min, max, zero, negative |
| Error paths | Invalid input, network failure, timeout |
| Concurrency | Rapid repeated calls, out-of-order responses |
For every behavioral contract, at least one test must exercise an input that the SUT should reject or handle differently from the happy path.
Examples: missing required argument, value at boundary + 1, hostile input.
Apply the cases relevant to the changed surface.
