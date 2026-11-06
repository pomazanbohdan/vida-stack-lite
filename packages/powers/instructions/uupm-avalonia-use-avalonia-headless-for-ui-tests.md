---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-avalonia-headless-for-ui-tests
title: "Use Avalonia.Headless for UI tests"
summary: "Run UI tests without display server"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L34"
status: active
revision: 1
---

# Use Avalonia.Headless for UI tests

Run UI tests without display server

**Do:** Avalonia.Headless for CI-compatible UI testing

**Don't:** Skipping UI tests in CI

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
[AvaloniaTest] public void Button_Click_Updates_Label() { ... }
```

**Bad example:**

```text
UI tests that require a display server
```
