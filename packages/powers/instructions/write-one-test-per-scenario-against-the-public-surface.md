---
instruction_id: write-one-test-per-scenario-against-the-public-surface
title: "Write one test per scenario, against the public surface"
summary: "One test per scenario, named for the scenario, exercised the way a user or a client does it."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A confirmed scenario list is turned into tests.
conditions_does_not_apply_when: The scenario list was not confirmed yet.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - one test per scenario
  - the visible outcome each test asserts
artifact_contract_verified_by: every test is named for its scenario and reaches the behavior through the UI or the public API
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# Write one test per scenario, against the public surface
One test per scenario from Phase 1, named for the scenario.
Each test:
- exercises the behavior the way a user or client does: through the UI with locators by role, label, or text, or through the public API, never through internals;
- asserts the visible outcome, not implementation details;
- creates the data it needs and leaves nothing behind that another test could see, so it passes alone and in any order;
- fails for one reason, so the failure names the broken behavior.
