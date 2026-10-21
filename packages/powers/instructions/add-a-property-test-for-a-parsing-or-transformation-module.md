---
instruction_id: add-a-property-test-for-a-parsing-or-transformation-module
title: Add a property test for a parsing or transformation module
summary: "A module that parses, transforms or bounds a value carries at least one property test asserting a domain invariant."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "A module implements parsing, transformation, budget or limit logic, or a bijective contract."
conditions_does_not_apply_when: The module has no input domain to generate values from.
artifact_contract_output_type: property-test
artifact_contract_required_data:
  - the domain invariant asserted
  - the generated input domain
artifact_contract_verified_by: the module carries a property test that asserts a named invariant over generated inputs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 1
---

# Add a property test for a parsing or transformation module
Modules that implement parsing, transformation, budget/limit logic, or any bijective contract
must include at least one
property test asserting a domain invariant.
Invariant categories to consider: round-trip, monotonicity, boundary containment, idempotency.
Property tests are the mechanism that drives mutation score above the threshold on logic-heavy paths.
