---
instruction_id: propose-a-missing-harness-as-its-own-change
title: Propose a missing harness as its own change
summary: "A missing end-to-end harness is a separate, confirmed change: the runner, the location and how the app starts under test."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The project has no end-to-end harness and end-to-end tests were requested.
conditions_does_not_apply_when: The project already has an end-to-end harness.
artifact_contract_output_type: harness-proposal
artifact_contract_required_data:
  - the proposed runner
  - where the tests go
  - how the app is started under test
artifact_contract_verified_by: no dependency and no configuration was added before the user confirmed the proposal
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
  - operations
---

# Propose a missing harness as its own change
When the project has no end-to-end harness, setting one up is its own change.
Propose the runner, where tests go, and how the app will be started under test, and HALT for the user's confirmation before adding a dependency or configuration.
