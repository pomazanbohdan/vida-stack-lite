---
instruction_id: delete-code-written-before-test
title: Delete code written before the test
summary: "Code written before its test is deleted, not kept as reference or adapted, and the cycle restarts from a failing test."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "You discover that code was written before the test, or the test after the code."
conditions_does_not_apply_when: The test existed and failed before the implementation appeared.
artifact_contract_output_type: restarted-tdd-cycle
artifact_contract_required_data:
  - deleted code
  - new test
  - expected failure
artifact_contract_verified_by: the new test fails before the replacement implementation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
---

# Delete code written before the test
Write code before the test? Delete it.
Start over.
No exceptions.
Don't keep it as "reference".
Don't "adapt" it while writing tests.
Don't look at it.
Delete means delete.
Implement fresh from tests. Period.
Code before test is a red flag.
Test after implementation is a red flag.
Test passes immediately is a red flag.
Can't explain why the test failed is a red flag.
Rationalizing "just this once" is a red flag.
All of these mean: delete code and start over with TDD.
