---
instruction_id: never-assert-on-elapsed-wall-clock-time
title: Never assert on elapsed wall-clock time
summary: "An assertion on elapsed wall-clock time measures the host machine, not the code under test, and fails spuriously on a loaded runner."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test asserts on how long something took.
conditions_does_not_apply_when: The test asserts on a controlled clock the test itself advances.
artifact_contract_output_type: timing-assertion-review
artifact_contract_required_data:
  - the timing assertion that was removed or replaced
  - the controlled signal the test asserts on instead
artifact_contract_verified_by: no assertion in the suite compares a wall-clock delta or a performance timer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 1
---

# Never assert on elapsed wall-clock time
Do not assert on wall-clock elapsed time.
Such assertions test the host machine, not the SUT, and fail spuriously on loaded CI runners.
Non-compliant:
const start = Date.now();
await doWork();
assert(Date.now() - start < 200, 'must complete in 200ms');
