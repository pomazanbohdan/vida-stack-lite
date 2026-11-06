---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-compiled-bindings-and-trimmerroots-xml-for-publishaot
title: "Use compiled bindings and TrimmerRoots.xml for PublishAot"
summary: "Avalonia 11+ supports Native AOT for self-contained desktop deployments; XAML reflection paths must use compiled bindings or be preserved via TrimmerRoots so trimming does not strip them"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L49"
status: active
revision: 1
---

# Use compiled bindings and TrimmerRoots.xml for PublishAot

Avalonia 11+ supports Native AOT for self-contained desktop deployments; XAML reflection paths must use compiled bindings or be preserved via TrimmerRoots so trimming does not strip them

**Do:** x:CompileBindings=True on every view plus TrimmerRoots.xml for runtime-resolved types

**Don't:** PublishAot with reflection-based {Binding} markup or trimming without checking warnings

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<UserControl x:CompileBindings="True" x:DataType="vm:MainViewModel"/> with <PublishAot>true</PublishAot> and TrimmerRoots.xml listing reflected types
```

**Bad example:**

```text
<PublishAot>true</PublishAot> with default <Binding> markup and no TrimmerRoots configuration
```
