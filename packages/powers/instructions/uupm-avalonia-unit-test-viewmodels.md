---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-unit-test-viewmodels
title: "Unit test ViewModels"
summary: "Test business logic independently"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L35"
status: active
revision: 1
---

# Unit test ViewModels

Test business logic independently

**Do:** xUnit or NUnit on ViewModel methods

**Don't:** Testing through UI only

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
[Fact] public void AddItem_IncreasesCount() { vm.AddItem(); Assert.Equal(1, vm.Items.Count); }
```

**Bad example:**

```text
Manual testing by running the app
```
