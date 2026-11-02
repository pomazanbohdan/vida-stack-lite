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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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
