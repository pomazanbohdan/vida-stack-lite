---
instruction_id: place-tests-by-level-and-cost
title: Place tests by level and cost
summary: "Put a pure-logic test at the unit level, a boundary-crossing test at the integration level and a critical flow at the end-to-end level, and keep the suite mostly small."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-cost-model
conditions_applies_when: A new test is being designed and its level is not yet decided.
conditions_does_not_apply_when: The level of the test is fixed by the framework or by the existing suite.
artifact_contract_output_type: test-placement
artifact_contract_required_data:
  - the level
  - the resource size
  - the reason
artifact_contract_verified_by: the level follows the decision guide and small tests dominate the suite
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
status: active
revision: 1
---

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

```
Is it pure logic with no side effects?
  → Unit test (small)

Does it cross a boundary (API, database, file system)?
  → Integration test (medium)

Is it a critical user flow that must work end-to-end?
  → E2E test (large) — limit these to critical paths
```
