---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-mock-services-in-tests
title: "Mock services in tests"
summary: "Isolate ViewModel from external dependencies"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L56"
status: active
revision: 1
---

# Mock services in tests

Isolate ViewModel from external dependencies

**Do:** Moq or NSubstitute for service interfaces

**Don't:** Real database calls in unit tests

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
var mock = new Mock<IDataService>(); var vm = new MainViewModel(mock.Object);
```

**Bad example:**

```text
new MainViewModel(new SqlDataService()) in tests
```
