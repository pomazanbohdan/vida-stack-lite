---
instruction_id: decide-whether-the-test-the-harness-or-the-application-is-wrong
title: "Decide whether the test, the harness or the application is wrong"
summary: "Every failure is classified first: a wrong test is fixed, a wrong harness is fixed, and a wrong application keeps the test and gets reported."
capability_tags:
  - triage-reports
pattern_tags:
  - test-design
  - report-triage
  - failing-test-policy
conditions_applies_when: The new tests fail.
conditions_does_not_apply_when: No test failed.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the class of each failure
  - the action taken on it
artifact_contract_verified_by: no assertion was weakened and no product code was changed to make a test pass
compatibility_excludes:
  - never-skip-or-silence-a-failing-test
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Decide whether the test, the harness or the application is wrong
For each failure, decide which it is:
- The test is wrong (locator, setup, or expectation): fix the test.
- The harness is wrong (app not started, data missing, credentials): fix the harness setup.
- The application is wrong: the test found a bug. Keep the test as written, mark it the way the framework marks an expected failure with the bug as the reason, and report it. Never weaken an assertion to make a test pass, and never change product code to make it pass.
