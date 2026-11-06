---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-datagrid-for-tabular-data
title: "Use DataGrid for tabular data"
summary: "DataGrid is a separate Avalonia.Controls.DataGrid NuGet package and requires its theme StyleInclude in App.axaml"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Controls guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L12"
status: active
revision: 1
---

# Use DataGrid for tabular data

DataGrid is a separate Avalonia.Controls.DataGrid NuGet package and requires its theme StyleInclude in App.axaml

**Do:** DataGrid after adding package and StyleInclude for the matching theme

**Don't:** Custom Grid layouts for tabular data or DataGrid without the theme StyleInclude

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<DataGrid ItemsSource="{Binding Items}" AutoGenerateColumns="False"/> with <StyleInclude Source="avares://Avalonia.Controls.DataGrid/Themes/Fluent.xaml"/> in App.axaml
```

**Bad example:**

```text
<DataGrid/> with no package reference or no StyleInclude (renders unstyled)
```
