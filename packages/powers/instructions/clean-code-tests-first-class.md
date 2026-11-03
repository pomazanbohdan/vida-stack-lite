---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-tests-first-class
title: Treat tests as first-class code
summary: "Follow TDD, test one concept per test, keep tests fast and independent, and refactor test code."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Writing or reviewing tests and production code under TDD.
conditions_does_not_apply_when: Characterization tests that only pin legacy behavior; use the legacy-code instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Tests are readable, isolated and refactored with production code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L132-L155"
status: active
revision: 1
---

# Treat tests as first-class code

Treat tests as first-class code and keep them clean. Follow the three TDD laws, test one concept per test, keep tests fast, independent, repeatable, self-validating and timely, use readable test helpers, and refactor tests with production code.
