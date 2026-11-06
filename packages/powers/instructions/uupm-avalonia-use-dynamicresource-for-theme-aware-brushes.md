---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-dynamicresource-for-theme-aware-brushes
title: "Use DynamicResource for theme-aware brushes"
summary: "ResourceDictionary.ThemeDictionaries entries must be looked up via DynamicResource - StaticResource resolves once at load and won't update when the active theme variant changes"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L52"
status: active
revision: 1
---

# Use DynamicResource for theme-aware brushes

ResourceDictionary.ThemeDictionaries entries must be looked up via DynamicResource - StaticResource resolves once at load and won't update when the active theme variant changes

**Do:** DynamicResource for brushes and colors that follow the active theme variant

**Don't:** Hardcoded hex colors or StaticResource for values that should follow theme

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<Border Background="{DynamicResource SystemControlBackgroundAccentBrush}"/>
```

**Bad example:**

```text
<Border Background="#FF0078D4"/> while the rest of the app honors light/dark variants
```
