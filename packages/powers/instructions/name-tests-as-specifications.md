---
instruction_id: name-tests-as-specifications
title: Name the test as a specification
summary: "Name each test after the module and the expected behavior in plain English, and write its body as arrange, act, assert."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test is being written or renamed.
conditions_does_not_apply_when: The test already names the behavior it checks.
artifact_contract_output_type: test-naming
artifact_contract_required_data:
  - module name
  - expected behavior in plain English
  - arrange act assert
artifact_contract_verified_by: the test name reads as a specification without opening the file
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

# Name the test as a specification
Check existing tests for patterns and conventions

```
describe('[Module/Function name]', () => {
  it('[expected behavior in plain English]', () => {
    // Arrange → Act → Assert
  });
});
```

Every test name should read like a specification
