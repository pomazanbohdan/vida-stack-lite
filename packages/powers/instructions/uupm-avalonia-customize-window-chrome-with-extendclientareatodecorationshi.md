---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-customize-window-chrome-with-extendclientareatodecorationshi
title: "Customize window chrome with ExtendClientAreaToDecorationsHint"
summary: "Set ExtendClientAreaToDecorationsHint to extend content into the title bar area and tag a region with WindowDecorationProperties.ElementRole=TitleBar to keep native drag and maximize behavior"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Windowing guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L54"
status: active
revision: 1
---

# Customize window chrome with ExtendClientAreaToDecorationsHint

Set ExtendClientAreaToDecorationsHint to extend content into the title bar area and tag a region with WindowDecorationProperties.ElementRole=TitleBar to keep native drag and maximize behavior

**Do:** ExtendClientAreaToDecorationsHint plus a region tagged ElementRole=TitleBar

**Don't:** SystemDecorations=None with hand-rolled PointerPressed dragging in code-behind

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<Window ExtendClientAreaToDecorationsHint="True"><Border WindowDecorationProperties.ElementRole="TitleBar"/></Window>
```

**Bad example:**

```text
<Window SystemDecorations="None"> with manual BeginMoveDrag from code-behind
```
