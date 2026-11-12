---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-define-themedictionaries-for-light-dark-and-highcontrast
title: "Define ThemeDictionaries for Light Dark and HighContrast"
summary: "Resources placed inside ResourceDictionary.ThemeDictionaries entries are automatically swapped when the system theme changes — required for theme-aware brushes"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L57"
status: active
revision: 1
---

# Define ThemeDictionaries for Light Dark and HighContrast

Resources placed inside ResourceDictionary.ThemeDictionaries entries are automatically swapped when the system theme changes — required for theme-aware brushes

**Do:** Wrap brushes in a ThemeDictionaries dictionary keyed by Light Dark and HighContrast in App.xaml or page resources

**Don't:** Defining a single brush at the root and missing dark/high-contrast variants

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<ResourceDictionary.ThemeDictionaries><ResourceDictionary x:Key="Light"><SolidColorBrush x:Key="Brand" Color="#005A9E"/></ResourceDictionary><ResourceDictionary x:Key="Dark"><SolidColorBrush x:Key="Brand" Color="#3A96DD"/></ResourceDictionary></ResourceDictionary.ThemeDictionaries>
```

**Bad example:**

```text
<SolidColorBrush x:Key="Brand" Color="#005A9E"/> at root with no theme variants
```
