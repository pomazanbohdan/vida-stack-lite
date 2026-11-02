---
instruction_id: never-skip-or-silence-a-failing-test
title: Never skip or silence a failing test
summary: "A skipped test and an unawaited assertion both hide a real bug, so the test is fixed or deleted rather than silenced."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
  - failing-test-policy
conditions_applies_when: "A test fails, is skipped, or ends without its assertion being awaited."
conditions_does_not_apply_when: The suite is green and no test is skipped.
artifact_contract_output_type: test-silence-review
artifact_contract_required_data:
  - the skipped or unawaited test
  - the reason it was silenced
  - what happens to the test now
artifact_contract_verified_by: "no test is skipped and every asynchronous assertion is awaited, so a rejection fails the test"
compatibility_excludes:
  - decide-whether-the-test-the-harness-or-the-application-is-wrong
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never skip or silence a failing test
Skipping tests to pass CI | Hides real bugs | Fix or delete the test
Using `test.skip` permanently | Dead code | Remove or fix it
No async error handling | Swallowed errors, false passes | Always `await` async tests
