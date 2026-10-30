---
instruction_id: keep-the-generated-coverage-simple-and-in-scope
title: Keep the generated coverage simple and in scope
summary: "Cover the main path and the errors a user can see, with the framework's own features, and leave the rest as follow-up work."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: Coverage is generated for work that is already implemented.
conditions_does_not_apply_when: The behaviour does not exist yet and the tests are written first.
artifact_contract_output_type: coverage-scope
artifact_contract_required_data:
  - what is covered
  - what is left out
  - the reason
artifact_contract_verified_by: "the tests use the framework's own features and the scope stays on the main path and the visible errors"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/test-completed-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the generated coverage simple and in scope
This is generated coverage of finished work.
Generated tests stay simple on purpose: the framework's standard features, the project's existing helpers, and tests that pass in any order.
It covers the main path and the errors a user can see, and no more.
It does not build shared test helpers.
More edge cases are follow-up work
