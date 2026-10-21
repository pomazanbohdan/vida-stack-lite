---
instruction_id: match-the-assertion-strength-to-what-the-requirement-demands
title: Match the assertion strength to what the requirement demands
summary: "A requirement that demands a value or a behaviour is not met by a test that only asserts existence, type or status."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: The assertion of a test is compared with the requirement it proves.
conditions_does_not_apply_when: The requirement only asks for existence.
artifact_contract_output_type: assertion-strength
artifact_contract_required_data:
  - the level the requirement demands
  - the level the test asserts
artifact_contract_verified_by: the test asserts at the level the requirement demands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-phase-gates.md
status: active
revision: 1
---

# Match the assertion strength to what the requirement demands
If a requirement demands value-level or behavioral-level proof and the test only has existence/type/status assertions → INSUFFICIENT
Existence
Type
Status
Value
Behavioral
