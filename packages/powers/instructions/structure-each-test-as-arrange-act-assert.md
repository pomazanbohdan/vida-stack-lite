---
instruction_id: structure-each-test-as-arrange-act-assert
title: "Structure each test as arrange, act, assert"
summary: "A test sets up its own data and preconditions, performs the one action under test, and asserts the outcome, with no state shared with other tests."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is written or rewritten.
conditions_does_not_apply_when: The work adds no test.
artifact_contract_output_type: test-structure-review
artifact_contract_required_data:
  - the arrange step
  - the act step
  - the assert step
  - the setup and teardown of the test
artifact_contract_verified_by: every test shows the three phases and sets up and tears down its own state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/testing-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Structure each test as arrange, act, assert
Arrange: Set up test data and preconditions
Act: Perform the action being tested
Assert: Verify the outcome
Shared mutable state | Tests pollute each other | Setup/teardown per test
