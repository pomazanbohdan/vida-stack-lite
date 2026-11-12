---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-compiled-bindings-over-reflection
title: "Use compiled bindings over reflection"
summary: "x:Bind generates code at compile time"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L26"
status: active
revision: 1
---

# Use compiled bindings over reflection

x:Bind generates code at compile time

**Do:** x:Bind for hot paths and list items

**Don't:** {Binding} in DataTemplates and frequently updated UI

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
<DataTemplate x:DataType="local:Item"><TextBlock Text="{x:Bind Name}"/></DataTemplate>
```

**Bad example:**

```text
<DataTemplate><TextBlock Text="{Binding Name}"/></DataTemplate>
```
