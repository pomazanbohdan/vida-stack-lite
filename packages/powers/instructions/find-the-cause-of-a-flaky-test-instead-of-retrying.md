---
instruction_id: find-the-cause-of-a-flaky-test-instead-of-retrying
title: Find the cause of a flaky test instead of retrying
summary: "A test that passes once and fails once is flaky; find the cause and fix it, never retry it."
capability_tags:
  - write-tests-first
pattern_tags:
  - systematic-debugging
conditions_applies_when: A test passes on one run and fails on the next.
conditions_does_not_apply_when: The test fails the same way on every run.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the cause of the flakiness
  - the fix applied
artifact_contract_verified_by: the cause is fixed and no retry was added to the test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# Find the cause of a flaky test instead of retrying
A test that passes once and fails once is flaky. Find the cause, usually a check that runs before the app has finished or state shared between tests, and fix it. Do not add retries.
