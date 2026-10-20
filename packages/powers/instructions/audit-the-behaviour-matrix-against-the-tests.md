---
instruction_id: audit-the-behaviour-matrix-against-the-tests
title: Audit the behaviour matrix against the tests
summary: "Every row of the plan's I/O and edge-case matrix must be covered by a test that ran and passed, and a test that contradicts the matrix means the code is wrong, not the expectation."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The plan carries an I/O and edge-case matrix and the code has been written.
conditions_does_not_apply_when: "The plan has no matrix, because the work has no meaningful I/O scenarios."
artifact_contract_output_type: matrix-audit
artifact_contract_required_data:
  - the matrix rows
  - the test that covers each row
  - the run result of each covering test
  - the gap for every row without a covering test
artifact_contract_verified_by: every matrix row has a covering test whose run and pass are in the verification output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
status: active
revision: 1
---

# Audit the behaviour matrix against the tests

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|

If `{plan_file}`'s `<frozen-after-approval>` block contains an I/O & Edge-Case Matrix, verify every matrix row is covered by at least one test that verifies its expected behavior, and that each covering test ran and passed in the verification output. A covering test that exists but did not run — unregistered, filtered out, skipped, or disabled — counts as missing. If a test disagrees with the matrix, never edit the expectation to match the code: fix the code, or if the matrix row itself is ambiguous, HALT and ask the human. Fix any other audit failure before proceeding.
