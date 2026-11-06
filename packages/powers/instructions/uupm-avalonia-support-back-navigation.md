---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-support-back-navigation
title: "Support back navigation"
summary: "Maintain navigation history for complex apps"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L40"
status: active
revision: 1
---

# Support back navigation

Maintain navigation history for complex apps

**Do:** Router.NavigateBack or custom back stack

**Don't:** No way to return to previous views

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<Button Command="{Binding Router.NavigateBack}" Content="Back"/>
```

**Bad example:**

```text
Single-direction navigation with no back support
```
