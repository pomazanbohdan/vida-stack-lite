---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-hotkey-or-keybinding-for-keyboard-shortcuts
title: "Use HotKey or KeyBinding for keyboard shortcuts"
summary: "Built-in HotKey on ICommandSource and Window.KeyBindings handle modifier keys focus scoping and cross-platform Ctrl/Cmd mapping"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Input guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L53"
status: active
revision: 1
---

# Use HotKey or KeyBinding for keyboard shortcuts

Built-in HotKey on ICommandSource and Window.KeyBindings handle modifier keys focus scoping and cross-platform Ctrl/Cmd mapping

**Do:** HotKey on a command-bound control or KeyBinding on the Window

**Don't:** Manual KeyDown handlers checking Key and KeyModifiers

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<Button Command="{Binding SaveCommand}" HotKey="Ctrl+S" Content="Save"/>
```

**Bad example:**

```text
OnKeyDown checking e.Key == Key.S && e.KeyModifiers == KeyModifiers.Control
```
