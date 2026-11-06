---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-enable-compiled-bindings-globally
title: "Enable compiled bindings globally"
summary: "Avalonia 12 enables AvaloniaUseCompiledBindingsByDefault by default so every binding requires x:DataType and remains trim-safe for Native AOT"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L4"
status: active
revision: 1
---

# Enable compiled bindings globally

Avalonia 12 enables AvaloniaUseCompiledBindingsByDefault by default so every binding requires x:DataType and remains trim-safe for Native AOT

**Do:** Keep the Avalonia 12 default or set AvaloniaUseCompiledBindingsByDefault explicitly when documenting the project contract

**Don't:** Disable compiled bindings or rely on runtime binding resolution

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
<AvaloniaUseCompiledBindingsByDefault>true</AvaloniaUseCompiledBindingsByDefault>
```

**Bad example:**

```text
<AvaloniaUseCompiledBindingsByDefault>false</AvaloniaUseCompiledBindingsByDefault>
```
