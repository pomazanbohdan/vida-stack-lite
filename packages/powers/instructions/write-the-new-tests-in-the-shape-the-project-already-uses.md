---
instruction_id: write-the-new-tests-in-the-shape-the-project-already-uses
title: Write the new tests in the shape the project already uses
summary: "The new tests reuse the runner, the layout, the fixtures and the app start the project already has."
capability_tags:
  - write-tests-first
pattern_tags:
  - project-conventions-first
conditions_applies_when: New tests are written into a project that already has an end-to-end harness.
conditions_does_not_apply_when: The project has no harness and one is being proposed as a separate change.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the runner used
  - the layout used
  - the fixtures used
  - the way the app is started
artifact_contract_verified_by: "the new tests use the same runner, layout, fixtures and app start as the existing ones"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the new tests in the shape the project already uses
The new tests follow what is there: same runner, same layout, same fixtures, same way of starting the app.
