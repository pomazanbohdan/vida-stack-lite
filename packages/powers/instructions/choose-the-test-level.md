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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/test-engineer.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
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
