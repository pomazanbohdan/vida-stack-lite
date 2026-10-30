---
instruction_id: write-only-tests-for-behavior-that-already-works
title: Write only tests for behavior that already works
summary: "The change adds coverage for behavior that already works, touches no product code, and lists any harness-only product change."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: End-to-end and API tests are requested for a feature that already behaves as intended.
conditions_does_not_apply_when: The work in flight has no working behavior yet; the build writes those tests.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the covered scenarios
  - the product code touched for the harness
  - the command that runs the new tests
artifact_contract_verified_by: the diff carries tests and no product code beyond what the harness needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write only tests for behavior that already works
Add end-to-end and API tests for behavior that already works, so that an agent or a person can change the code and know it still works.
Tests only: no review of the implementation, and no product code changes beyond what the harness needs to reach an element, such as a test id. List any such change in the report.
