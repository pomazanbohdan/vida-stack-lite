---
instruction_id: run-the-new-tests-twice
title: Run the new tests twice
summary: The new tests run twice; the second run is what shows whether they hold.
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-rerun-policy
conditions_applies_when: The new tests have been written.
conditions_does_not_apply_when: The tests could not be executed at all.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the result of the first run
  - the result of the second run
artifact_contract_verified_by: the new tests were run a second time and both results are recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the new tests twice
Run the new tests, then run them a second time.
