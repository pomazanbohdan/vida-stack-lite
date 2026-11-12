---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-agents-test-engineer-md-a97cbe21-c01"
title: "addy-skills: agents/test-engineer.md module"
summary: "Carrier for 6 atomic instructions from addy-skills:agents/test-engineer.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"agents/test-engineer.md\"}"
atom_ids:
  - avoid-unreviewed-snapshot-tests
  - choose-the-test-level
  - cover-the-scenario-classes
  - keep-tests-independent
  - name-tests-as-specifications
  - rank-recommended-tests-by-risk
atom_count: 6
atoms: "[{\"atom_id\":\"avoid-unreviewed-snapshot-tests\",\"file_sha256\":\"7b41119f6097f10320233aed16b1f74bdf05170c4c846bb7703e4e3d9abaa108\",\"content_sha256\":\"9eb220e4401271ed21ccd554f77742a561e6ee77f7cc85c1c933914e4689e015\",\"file_bytes\":1105,\"body_bytes\":105},{\"atom_id\":\"choose-the-test-level\",\"file_sha256\":\"2d724d7270516c0f41f6aa7efb32f67102195ac01673772f3910e735387c1783\",\"content_sha256\":\"bd1525b3336c766dfae510ef682d8458ff60c902034936bb4e001731745b5870\",\"file_bytes\":2629,\"body_bytes\":1411},{\"atom_id\":\"cover-the-scenario-classes\",\"file_sha256\":\"64afefb4ec645906afb3388bb66cb3a913427b5a3a0507ff046b184f2e6d90e8\",\"content_sha256\":\"4a47fa5e4bd0ffb0edef4960a9091633f14522e789d5c5c92355f17d0adf67ed\",\"file_bytes\":1829,\"body_bytes\":658},{\"atom_id\":\"keep-tests-independent\",\"file_sha256\":\"791cd599117382267f799f3d2e193f9641d492e086bb53cdb509ac6b9cf32f09\",\"content_sha256\":\"3cbb7cdb62b217580107704d4f5751d253900bfab5b2ce959bf71d2ae8d92cf7\",\"file_bytes\":1074,\"body_bytes\":136},{\"atom_id\":\"name-tests-as-specifications\",\"file_sha256\":\"e9993753730e0bad61e311f816b4bf77c0bbe3cc7f5f888d6dceb79320ec2ee4\",\"content_sha256\":\"0de0f692534c7eaf9f05d9db58d556ae3c93939fd3fc8861d522501b4b320f05\",\"file_bytes\":1301,\"body_bytes\":284},{\"atom_id\":\"rank-recommended-tests-by-risk\",\"file_sha256\":\"6659cb7b95d3d2adc206ae9e177b4f7d3ec73fd89bca79b7f50cfe359bf1411c\",\"content_sha256\":\"1add9c1ff566bdc65db32407502bd20d91cf00f21f2b5dfe0cee24747434ce4a\",\"file_bytes\":1464,\"body_bytes\":354}]"
carrier_sha256: d6bbe46a1b2252053253c7a50d99ae1f6239b209edcfe3b0f08a018006435617
carrier_bytes: 10065
revision: 1
status: active
---
<!-- vpmodule:atom:begin avoid-unreviewed-snapshot-tests -->
---
instruction_id: avoid-unreviewed-snapshot-tests
title: Avoid snapshot tests nobody reviews
summary: Use a snapshot assertion only when every change to the snapshot is reviewed.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A snapshot assertion is being added to a suite.
conditions_does_not_apply_when: The suite holds no snapshot assertion.
artifact_contract_output_type: snapshot-decision
artifact_contract_required_data:
  - snapshot assertion
  - reviewed on every change or not
  - alternative assertion
artifact_contract_verified_by: every snapshot assertion in the suite is reviewed on each change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Avoid snapshot tests nobody reviews
Avoid snapshot tests unless reviewing every change to the snapshot
<!-- vpmodule:atom:end avoid-unreviewed-snapshot-tests -->
<!-- vpmodule:atom:begin choose-the-test-level -->
---
instruction_id: choose-the-test-level
title: Choose the test level
summary: "Choose the cheapest test level that still captures the behavior: unit, integration or end to end."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
  - test-placement-strategy
conditions_applies_when: A test is about to be written and its level is not fixed.
conditions_does_not_apply_when: The level of the test is already agreed.
artifact_contract_output_type: test-level-choice
artifact_contract_required_data:
  - behavior under test
  - chosen level
  - why the lower level does not capture it
artifact_contract_verified_by: no end-to-end test covers behavior that a unit or an integration test can capture
compatibility_excludes:
  - choose-the-highest-test-seam
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/test-driven-development/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the test level
```
Pure logic, no I/O          → Unit test
Crosses a boundary          → Integration test
Critical user flow          → E2E test
```

Test at the lowest level that captures the behavior. Don't write E2E tests for things unit tests can cover.

# Place tests by level and cost
## The Test Pyramid
Invest testing effort according to the pyramid — most tests should be small and fast, with progressively fewer tests at higher levels.
### Test Sizes (Resource Model)
Beyond the pyramid levels, classify tests by what resources they consume:
| Size | Constraints | Speed | Example |
|------|------------|-------|---------|
| **Small** | Single process, no I/O, no network, no database | Milliseconds | Pure function tests, data transforms |
| **Medium** | Multi-process OK, localhost only, no external services | Seconds | API tests with test DB, component tests |
| **Large** | Multi-machine OK, external services allowed | Minutes | E2E tests, performance benchmarks, staging integration |
Small tests should make up the vast majority of your suite. They're fast, reliable, and easy to debug when they fail.
### Decision Guide
Is it pure logic with no side effects?
→ Unit test (small)
Does it cross a boundary (API, database, file system)?
→ Integration test (medium)
Is it a critical user flow that must work end-to-end?
→ E2E test (large) — limit these to critical paths
<!-- vpmodule:atom:end choose-the-test-level -->
<!-- vpmodule:atom:begin cover-the-scenario-classes -->
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
<!-- vpmodule:atom:end cover-the-scenario-classes -->
<!-- vpmodule:atom:begin keep-tests-independent -->
---
instruction_id: keep-tests-independent
title: Keep the tests independent
summary: Keep every test to one concept and free of shared mutable state.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Tests are being written, or a suite fails depending on the order it runs in."
conditions_does_not_apply_when: The suite holds a single test.
artifact_contract_output_type: test-independence
artifact_contract_required_data:
  - test
  - concept checked
  - shared state removed
artifact_contract_verified_by: the tests pass in any order and in isolation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the tests independent
Each test should verify one concept

Tests should be independent — no shared mutable state between tests
<!-- vpmodule:atom:end keep-tests-independent -->
<!-- vpmodule:atom:begin name-tests-as-specifications -->
---
instruction_id: name-tests-as-specifications
title: Name the test as a specification
summary: "Name each test after the module and the expected behavior in plain English, and write its body as arrange, act, assert."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test is being written or renamed.
conditions_does_not_apply_when: The test already names the behavior it checks.
artifact_contract_output_type: test-naming
artifact_contract_required_data:
  - module name
  - expected behavior in plain English
  - arrange act assert
artifact_contract_verified_by: the test name reads as a specification without opening the file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the test as a specification
Check existing tests for patterns and conventions

```
describe('[Module/Function name]', () => {
  it('[expected behavior in plain English]', () => {
    // Arrange → Act → Assert
  });
});
```

Every test name should read like a specification
<!-- vpmodule:atom:end name-tests-as-specifications -->
<!-- vpmodule:atom:begin rank-recommended-tests-by-risk -->
---
instruction_id: rank-recommended-tests-by-risk
title: Rank the recommended tests by what they protect
summary: "Rank the tests you recommend by what they protect: data loss and security first, core logic next, edge cases and utilities last."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A coverage analysis recommends tests that have not been written yet.
conditions_does_not_apply_when: The recommended tests have already been written and ranked.
artifact_contract_output_type: ranked-test-recommendations
artifact_contract_required_data:
  - coverage gaps
  - recommended tests
  - priority per test
artifact_contract_verified_by: "every recommended test names what it verifies, why it matters and its priority"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Rank the recommended tests by what they protect
Recommended Tests
1. **[Test name]** — [What it verifies, why it matters]

### Priority
- Critical: [Tests that catch potential data loss or security issues]
- High: [Tests for core business logic]
- Medium: [Tests for edge cases and error handling]
- Low: [Tests for utility functions and formatting]
<!-- vpmodule:atom:end rank-recommended-tests-by-risk -->