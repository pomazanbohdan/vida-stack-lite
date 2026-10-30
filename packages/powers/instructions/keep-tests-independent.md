---
instruction_id: keep-tests-independent
title: Keep the tests independent
summary: Keep every test to one concept and free of shared mutable state.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Tests are being written, or a suite fails depending on the order it runs in."
conditions_does_not_apply_when: The suite holds a single test.
artifact_contract_output_type: test-independence
artifact_contract_required_data:
  - test
  - concept checked
  - shared state removed
artifact_contract_verified_by: the tests pass in any order and in isolation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the tests independent
Each test should verify one concept

Tests should be independent — no shared mutable state between tests
