---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-virtualizingstackpanel-for-large-lists
title: "Use VirtualizingStackPanel for large lists"
summary: "Only creates UI elements for visible items. ListBox/ListView virtualize by default; TreeView requires opt-in"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L33"
status: active
revision: 1
---

# Use VirtualizingStackPanel for large lists

Only creates UI elements for visible items. ListBox/ListView virtualize by default; TreeView requires opt-in

**Do:** VirtualizingStackPanel.IsVirtualizing=True (set on TreeView; default for ListBox)

**Don't:** Disabling virtualization on long lists

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
<TreeView VirtualizingStackPanel.IsVirtualizing="True" VirtualizingStackPanel.VirtualizationMode="Recycling"/>
```

**Bad example:**

```text
<ListBox ScrollViewer.CanContentScroll="False"/>
```
