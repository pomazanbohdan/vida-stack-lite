---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-keep-theme-switching-centralized
title: "Keep theme switching centralized"
summary: "Dark mode switching should not be scattered across controllers"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Theme guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L51"
status: active
revision: 1
---

# Keep theme switching centralized

Dark mode switching should not be scattered across controllers

**Do:** Use a ThemeService that sets user-agent stylesheet and app CSS variants

**Don't:** Let each controller decide its own theme

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
themeService.apply(ThemeMode.DARK);
```

**Bad example:**

```text
if(dark) button.setStyle(...);
```
