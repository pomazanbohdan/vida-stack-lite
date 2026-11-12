---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-organize-resources-with-merged-dictionaries
title: "Organize resources with merged dictionaries"
summary: "Share styles and brushes via App.xaml MergedDictionaries instead of duplicating per page"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L58"
status: active
revision: 1
---

# Organize resources with merged dictionaries

Share styles and brushes via App.xaml MergedDictionaries instead of duplicating per page

**Do:** MergedDictionaries in App.xaml for shared styles brushes and colors

**Don't:** Duplicating SolidColorBrush definitions on every page

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<Application.Resources><ResourceDictionary><ResourceDictionary.MergedDictionaries><ResourceDictionary Source="Themes/Brushes.xaml"/></ResourceDictionary.MergedDictionaries></ResourceDictionary></Application.Resources>
```

**Bad example:**

```text
SolidColorBrush Color hardcoded inline on every page
```
