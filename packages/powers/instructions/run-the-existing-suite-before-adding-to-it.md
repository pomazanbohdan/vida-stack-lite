---
instruction_id: run-the-existing-suite-before-adding-to-it
title: Run the existing suite before adding to it
summary: "The existing suite runs once before the new tests land, and a pre-existing failure is reported rather than fixed."
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-before-completion
conditions_applies_when: New tests are about to be added to a suite that already exists.
conditions_does_not_apply_when: No existing suite exists in the project.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the result of the existing suite before the change
  - the findings the pre-existing failure produced
artifact_contract_verified_by: the pre-existing failure is in the report and was not fixed in this change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# Run the existing suite before adding to it
Run the existing end-to-end suite, or the closest subset, once before adding to it.
A suite that does not pass on the current code is a finding for the report, not something to fix here.
