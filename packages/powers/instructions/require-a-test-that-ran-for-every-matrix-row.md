---
instruction_id: require-a-test-that-ran-for-every-matrix-row
title: Require a test that ran for every matrix row
summary: Every row of the edge-case matrix is covered by a test that verifies its expected behaviour and that actually ran and passed.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: The plan carries an edge-case matrix.
conditions_does_not_apply_when: The plan has no edge-case matrix.
artifact_contract_output_type: matrix-coverage-audit
artifact_contract_required_data:
  - the matrix rows
  - the covering test of each row
  - the run that proves it
artifact_contract_verified_by: every matrix row has a covering test that ran and passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 1
---

# Require a test that ran for every matrix row
verify every matrix row is covered by at least one test that verifies its expected behavior, and that each covering test ran and passed in the verification output.
A covering test that exists but did not run — unregistered, filtered out, skipped, or disabled — counts as missing.
