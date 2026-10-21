---
instruction_id: write-tests-that-catch-breaks
title: Write tests that catch a specific break
summary: "Every test names the break it catches and exercises real behavior, not a mock, a proxy, or the source text."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "You write, change, or review a test or risky logic."
conditions_does_not_apply_when: "The test already names its break, checks real behavior, and survives a mutation check."
artifact_contract_output_type: honest-test
artifact_contract_required_data:
  - named break
  - independent expectation
  - real behavior checked
  - mutation check
artifact_contract_verified_by: a realistic mutation of the production code fails at least one test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/writing-good-tests.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-test-behavior-not-implementation/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/tests.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 7
---

# Write tests that catch a specific break
A test exists to catch a specific break.
Every test names the break it catches. Every test exercises the real thing.
Strict test-first development produces both naturally: a test written first and watched failing against real code has already proven it can fail, and only earns a mock when the real dependency proves slow or external.
Before writing the test body, answer what production change should make this test fail, and whether that change is a bug or a decision.
A test earns its place by catching a wrong branch, a missing side effect, a wrong argument, a boundary case, or a broken contract.
Derive expectations independently, with literals and hand-checked fixtures. An expectation computed by the code under test passes no matter what that code does.
No change detectors. If only intentional decisions can fail a test, it fires on redesign and sleeps through bugs. Test the behavior that depends on the decision.
Assert behavior, not text. Asserting that a script, instruction, or configuration contains an exact line proves only that the source is the source. Run scripts against controlled inputs and assert outputs, side effects, or exit codes.
Test your own boundary contract, not the framework's documented mechanics.
Constructors, getters, constants, and trivial forwarding earn tests only when they validate, normalize, default, derive, enforce, or cause side effects. Otherwise assert the first consumer-visible result that depends on them.
The mock earns no assertions. A mock assertion passes when the mock is present and fails when it is absent, and says nothing about the component. Assert the real component's behavior.
Learn every side effect of the real method before replacing it. Mock the slow or external operation and keep what the test depends on real.
Make doubles specific. When arguments, call counts, or ordering are part of the contract, assert them. A fake that accepts anything verifies nothing.
Mirror real data completely: all documented fields, not just the ones the test reads. Partial mocks fail silently when downstream code reads an omitted field.
Cleanup that only tests need lives in test utilities, never as a destroy method on the production class.
When mock setup outgrows the test logic, or tests break when the mock changes, switch to an integration test with real components.
Before finishing, mentally mutate the production code. At least one test should fail for each realistic mutation: a wrong constant or argument, a wrong branch handler, a missing state change, an empty return, or missing validation for zero, empty, nil, unauthorized, or malformed input.
A mutation nothing catches marks the behavior as unprotected, or the test as tautological.
Tests ship with the implementation. Trivial code and human prose earn none.
Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.
**Implementation-coupled** tests mock internal collaborators, test private methods, or verify through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.

Use snapshots sparingly and review every change.
Exercise real code, not source or output text.
Tests call exported functions or run the CLI and parse structured output.
They do not `readFileSync` a source file and assert on its text content.
They do not assert on raw stdout/stderr strings beyond exit-code confirmation.
Test the claimed path.
The test name describes a behavior.
The test body must exercise that behavior through the implementation path, not through a mock that replaces the entire SUT.
If the test name says "acquireLock expires after TTL," the test must call `acquireLock` (not a hand-rolled stub that does nothing) and assert that a lock acquired at time T is expired at time T + TTL + 1ms.
