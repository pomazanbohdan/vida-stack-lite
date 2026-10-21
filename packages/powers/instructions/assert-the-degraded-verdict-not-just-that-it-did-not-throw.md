---
instruction_id: assert-the-degraded-verdict-not-just-that-it-did-not-throw
title: "Assert the degraded verdict, not just that it did not throw"
summary: "A test of a fallback branch asserts the specific degraded verdict the branch produces, not merely that the call survived."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "The code under test has an error, fallback or degradation branch and a test covers that branch."
conditions_does_not_apply_when: "The branch re-throws, or already returns a structured error signal the test asserts on directly."
artifact_contract_output_type: degraded-verdict-assertion
artifact_contract_required_data:
  - the degraded verdict the branch produces
  - the asserted fields of that verdict
artifact_contract_verified_by: the test fails when the branch degrades to a different shape than the one asserted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 1
---

# Assert the degraded verdict, not just that it did not throw
If a function has an error or fallback branch — a guard that degrades permissively on bad input, a resolver that falls back to a default root, a lock that expires — the test for that branch must assert the **specific degraded verdict** the branch produces, not merely that the call completed without throwing or returned *some* value of the right type.
A test can already satisfy "feed the SUT a hostile input" while still failing this one, if it never checks *what the SUT did in response*.
This is not the same requirement as the input-rejection rule above it.
Two shapes are explicitly out of scope for this rule — they are not fail-open guards and adding this counter-test to them would be noise, not signal:
- A branch that re-throws or propagates the error rather than producing a degraded verdict
- A branch that returns a documented, structured error signal that the test already asserts on directly (a three-state policy that fails closed on malformed input, a dispatch convention, an `{isError: true}` return shape) — the structured field *is* the verdict; asserting on it already satisfies this rule.
The permissive-verdict shape is module-specific, not mechanically enumerable, so a lint rule here would be both incomplete and noisy.
This is a code-review expectation, not a CI gate — it will not fail a build on its own;
it fails when a reviewer lets a "did not throw" test stand in for a correctness test.
