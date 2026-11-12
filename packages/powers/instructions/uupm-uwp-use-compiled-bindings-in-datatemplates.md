---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-compiled-bindings-in-datatemplates
title: "Use compiled bindings in DataTemplates"
summary: "x:Bind in templates requires x:DataType"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L30"
status: active
revision: 1
---

# Use compiled bindings in DataTemplates

x:Bind in templates requires x:DataType

**Do:** x:DataType on DataTemplate for compiled bindings

**Don't:** {Binding} in item templates for large lists

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
<DataTemplate x:DataType="local:Item"><TextBlock Text="{x:Bind Name}"/></DataTemplate>
```

**Bad example:**

```text
<DataTemplate><TextBlock Text="{Binding Name}"/></DataTemplate>
```
