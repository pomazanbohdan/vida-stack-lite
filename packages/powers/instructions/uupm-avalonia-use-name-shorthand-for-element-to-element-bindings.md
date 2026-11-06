---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-name-shorthand-for-element-to-element-bindings
title: "Use #name shorthand for element-to-element bindings"
summary: "Compiled bindings cannot resolve {Binding ElementName=...} - use the #name shorthand which relies on NameScope lookup"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "XAML guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L5"
status: active
revision: 1
---

# Use #name shorthand for element-to-element bindings

Compiled bindings cannot resolve {Binding ElementName=...} - use the #name shorthand which relies on NameScope lookup

**Do:** #name shorthand referencing x:Name controls in the same NameScope

**Don't:** ElementName binding inside a compiled-binding scope

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<TextBlock Text="{Binding #SearchBox.Text}"/>
```

**Bad example:**

```text
<TextBlock Text="{Binding ElementName=SearchBox, Path=Text}"/> under compiled bindings
```
