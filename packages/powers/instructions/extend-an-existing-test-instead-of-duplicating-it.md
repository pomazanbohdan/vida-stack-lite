---
instruction_id: extend-an-existing-test-instead-of-duplicating-it
title: Extend an existing test instead of duplicating it
summary: "Before a test is written, the existing tests for the same scenario are searched; if one covers it, that test is extended rather than a second copy written."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is about to be written for a scenario that may already be covered.
conditions_does_not_apply_when: No test exists for the scenario.
artifact_contract_output_type: test-deduplication-record
artifact_contract_required_data:
  - the existing test that covers the scenario
  - the decision to extend it
artifact_contract_verified_by: no second test covers a scenario an existing test already covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-tests.md
status: active
revision: 1
---

# Extend an existing test instead of duplicating it
Check for existing tests covering the same scenario:
If found, extend rather than duplicate.
