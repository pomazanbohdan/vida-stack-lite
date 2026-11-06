---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-test-on-all-target-platforms
title: "Test on all target platforms"
summary: "Rendering and behavior varies across platforms"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Cross-Platform guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L20"
status: active
revision: 1
---

# Test on all target platforms

Rendering and behavior varies across platforms

**Do:** CI testing on Windows macOS and Linux

**Don't:** Testing only on development platform

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
GitHub Actions matrix with windows-latest ubuntu-latest macos-latest
```

**Bad example:**

```text
Testing only on Windows assuming cross-platform works
```
