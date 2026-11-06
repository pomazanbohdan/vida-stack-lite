---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-onplatform-and-onformfactor-markup-for-per-os-values
title: "Use OnPlatform and OnFormFactor markup for per-OS values"
summary: "OnPlatform and OnFormFactor markup extensions resolve to a different value per OS or form factor at XAML load time and replace if-statements in code-behind for tweaks like fonts spacing or icon sizes"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Cross-Platform guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L57"
status: active
revision: 1
---

# Use OnPlatform and OnFormFactor markup for per-OS values

OnPlatform and OnFormFactor markup extensions resolve to a different value per OS or form factor at XAML load time and replace if-statements in code-behind for tweaks like fonts spacing or icon sizes

**Do:** OnPlatform with Default Windows macOS Linux entries directly in the property setter

**Don't:** RuntimeInformation.IsOSPlatform branches in code-behind to set XAML properties

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<TextBlock FontFamily="{OnPlatform Default='Inter', Windows='Segoe UI', macOS='SF Pro Text', Linux='Ubuntu'}"/>
```

**Bad example:**

```text
if (OperatingSystem.IsWindows()) textBlock.FontFamily = new("Segoe UI"); else if (OperatingSystem.IsMacOS()) ...
```
