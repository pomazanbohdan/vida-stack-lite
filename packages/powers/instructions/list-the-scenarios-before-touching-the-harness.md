---
instruction_id: list-the-scenarios-before-touching-the-harness
title: List the scenarios before touching the harness
summary: The scenarios the tests must cover are listed in the words of a product person and confirmed before any test is written.
capability_tags:
  - write-tests-first
pattern_tags:
  - specification-gate
conditions_applies_when: The feature to cover is known and the tests have not been written yet.
conditions_does_not_apply_when: The scenario list was already confirmed in this session.
artifact_contract_output_type: scenario-list
artifact_contract_required_data:
  - the scenarios to cover
  - the scenarios an existing test already covers
artifact_contract_verified_by: the user confirmed the list before the first test was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# List the scenarios before touching the harness
Then list the scenarios the tests must cover, before touching the harness.
Each scenario is one sentence a product person would recognize: who does what, and what they see.
Mark the scenarios an existing test already covers.
Present the list and HALT for the user's confirmation before writing tests.
