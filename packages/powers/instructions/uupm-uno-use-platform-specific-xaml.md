---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-platform-specific-xaml
title: "Use platform-specific XAML"
summary: "Conditional namespaces for platform-specific UI"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Conditional guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L6"
status: active
revision: 1
---

# Use platform-specific XAML

Conditional namespaces for platform-specific UI

**Do:** xmlns:android xmlns:ios xmlns:wasm for platform XAML

**Don't:** Shared XAML when platforms need different controls

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<TextBlock android:Text="Android" ios:Text="iOS" Text="Default"/>
```

**Bad example:**

```text
#if in code-behind to set text per platform
```
