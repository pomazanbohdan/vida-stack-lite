---
instruction_id: stay-with-the-frameworks-standard-api-for-the-tests-you-add-now
title: "Stay with the framework's standard API for the tests you add now"
summary: "No new fixture layer, no page-object hierarchy and no utility module for the tests being added."
capability_tags:
  - write-tests-first
pattern_tags:
  - project-conventions-first
conditions_applies_when: Tests are added to an existing project.
conditions_does_not_apply_when: A test framework of its own is being set up as a separate change.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the framework API used
  - the project helpers used
artifact_contract_verified_by: the new tests use the standard API and the existing helpers and add no layer of their own
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

# Stay with the framework's standard API for the tests you add now
Stay with the framework's standard API and the project's existing helpers. Do not build a fixture layer, page-object hierarchy, or utility module for the tests you are adding now.
