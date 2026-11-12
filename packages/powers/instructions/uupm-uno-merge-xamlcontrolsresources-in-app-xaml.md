---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-merge-xamlcontrolsresources-in-app-xaml
title: "Merge XamlControlsResources in App.xaml"
summary: "Required for Fluent control styles to load — without it controls render with no template"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L51"
status: active
revision: 1
---

# Merge XamlControlsResources in App.xaml

Required for Fluent control styles to load — without it controls render with no template

**Do:** Add XamlControlsResources at the top of Application.Resources MergedDictionaries

**Don't:** Skipping the merged dictionary and wondering why Buttons look unstyled

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<Application.Resources><ResourceDictionary><ResourceDictionary.MergedDictionaries><XamlControlsResources xmlns="using:Microsoft.UI.Xaml.Controls"/></ResourceDictionary.MergedDictionaries></ResourceDictionary></Application.Resources>
```

**Bad example:**

```text
<Application.Resources><SolidColorBrush x:Key="MyBrush" Color="Red"/></Application.Resources> with no XamlControlsResources merged
```
