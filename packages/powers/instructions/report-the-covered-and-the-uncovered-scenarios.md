---
instruction_id: report-the-covered-and-the-uncovered-scenarios
title: Report the covered and the uncovered scenarios
summary: "The report names the covered scenarios, the uncovered ones and why, the bugs found and the command that runs the tests."
capability_tags:
  - write-tests-first
pattern_tags:
  - output-formatting
conditions_applies_when: The new tests have been written and run.
conditions_does_not_apply_when: The work stops before the tests were written.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - each covered scenario and its test file
  - each uncovered scenario and why
  - the bugs the tests found
  - the command that runs the new tests
artifact_contract_verified_by: "the report names every scenario of the list as covered or uncovered, and no summary file was written"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# Report the covered and the uncovered scenarios
In chat:
- each scenario covered, with its test file
- each scenario from Phase 1 left uncovered, and why
- bugs the tests found
- product code touched for the harness, if any
- the command that runs the new tests
Do not write a summary file: the tests and their commit are the record.
