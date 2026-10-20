---
instruction_id: name-tests-by-unit-behaviour-and-condition
title: "Name tests by unit, behaviour and condition"
summary: "A test name states the unit, the expected behaviour and the condition that produces it."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is named.
conditions_does_not_apply_when: The work adds no test.
artifact_contract_output_type: test-name-review
artifact_contract_required_data:
  - the unit
  - the expected behaviour
  - the condition
artifact_contract_verified_by: "every test name can be read as unit, expected behaviour and condition"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/testing-patterns.md
status: active
revision: 1
---

# Name tests by unit, behaviour and condition
// Pattern: [unit] [expected behavior] [condition]
describe('TaskService.createTask', () => {
  it('creates a task with default pending status', () => {});
  it('throws ValidationError when title is empty', () => {});
  it('trims whitespace from title', () => {});
  it('generates a unique ID for each task', () => {});
});
