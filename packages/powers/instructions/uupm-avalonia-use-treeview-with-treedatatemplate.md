---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-treeview-with-treedatatemplate
title: "Use TreeView with TreeDataTemplate"
summary: "Avalonia uses TreeDataTemplate for hierarchical data - HierarchicalDataTemplate is WPF only"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L13"
status: active
revision: 1
---

# Use TreeView with TreeDataTemplate

Avalonia uses TreeDataTemplate for hierarchical data - HierarchicalDataTemplate is WPF only

**Do:** TreeDataTemplate inside TreeView.ItemTemplate with ItemsSource pointing at child collection

**Don't:** HierarchicalDataTemplate copied from WPF or nested ItemsControls

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
<TreeView ItemsSource="{Binding Nodes}"><TreeView.ItemTemplate><TreeDataTemplate ItemsSource="{Binding Children}"><TextBlock Text="{Binding Name}"/></TreeDataTemplate></TreeView.ItemTemplate></TreeView>
```

**Bad example:**

```text
<TreeView><TreeView.ItemTemplate><HierarchicalDataTemplate/></TreeView.ItemTemplate></TreeView> // HierarchicalDataTemplate does not exist in Avalonia
```
