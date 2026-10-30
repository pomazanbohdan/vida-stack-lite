---
instruction_id: write-the-failing-test-before-you-fix-the-bug
title: Write the failing test before you fix the bug
summary: "A test that reproduces the defect is written and watched fail; if it cannot fail, the hypothesis is wrong."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A defect with a confirmed cause is about to be fixed.
conditions_does_not_apply_when: The defect cannot be reproduced in a test at all.
artifact_contract_output_type: regression-test
artifact_contract_required_data:
  - the test
  - the failing output before the fix
artifact_contract_verified_by: the test was observed failing before the fix and passing after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the failing test before you fix the bug
Write a failing test that reproduces the bug, then fix until the test passes.
Test MUST fail before the fix is applied
If the test cannot be made to fail initially, this indicates either:
The test does not correctly reproduce the bug (rewrite it)
The root cause hypothesis is wrong (return to investigation_loop)
Never skip the red phase. A test that passes before the fix tells you nothing.
