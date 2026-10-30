---
instruction_id: make-the-red-failure-intentional
title: Make the red failure intentional
summary: "The named target test must be the test that fails, on an assertion for the planned behaviour; a non-zero exit alone is not red."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test has been written and is about to be run for the first time.
conditions_does_not_apply_when: The test is being run as a regression check after the change.
artifact_contract_output_type: red-evidence
artifact_contract_required_data:
  - the target test
  - the assertion it failed on
artifact_contract_verified_by: the named target test failed on the planned assertion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/tdd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the red failure intentional
The TARGET test you named must be the test that fails, on an assertion for the planned behavior. A nonzero exit alone is NOT RED — syntax errors, zero-test discovery, fixture crashes, parser errors, and unrelated assertions are INVALID_RED and must not authorize GREEN
If test passes: feature exists or test is wrong. Investigate
