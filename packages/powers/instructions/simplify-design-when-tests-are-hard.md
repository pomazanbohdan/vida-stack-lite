---
instruction_id: simplify-design-when-tests-are-hard
title: Simplify the design when the test becomes hard
summary: "When a test needs heavy setup or constant mocking, treat that as a design signal: simplify the interface instead of complicating the test."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "The test needs many substitutions, a large setup, or cannot be formulated."
conditions_does_not_apply_when: The complexity comes from an external format that will not change.
artifact_contract_output_type: simplified-design
artifact_contract_required_data:
  - source of complexity
  - interface change
  - verification
artifact_contract_verified_by: the test becomes writable without hidden setup
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Simplify the design when the test becomes hard
Don't know how to test? Write the wished-for API.
Write the assertion first.
Ask your human partner.
Test too complicated? Design too complicated.
Simplify the interface.
Must mock everything? Code too coupled.
Use dependency injection.
Test setup huge? Extract helpers.
Still complex? Simplify design.
Test hard equals design unclear.
Listen to the test.
Hard to test equals hard to use.
Hard to test? Fix the design, not the test.
When writing or changing any test, name the production change that would make the test fail before writing it.
Assert on real behavior, never on mock behavior.
Keep test-only code in test utilities, out of production classes.
Understand a dependency's side effects before mocking it.
