---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-listview-virtualization-for-large-lists
title: "Use ListView virtualization for large lists"
summary: "Only renders visible items to reduce memory and layout cost"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L47"
status: active
revision: 1
---

# Use ListView virtualization for large lists

Only renders visible items to reduce memory and layout cost

**Do:** ListView with default ItemsStackPanel virtualization

**Don't:** ItemsControl or StackPanel for large data sets

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<ListView ItemsSource="{x:Bind Items}"/> (virtualizes by default)
```

**Bad example:**

```text
<ItemsControl><StackPanel> rendering 5000 items at once
```
