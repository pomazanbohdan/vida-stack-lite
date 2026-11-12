---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-support-high-contrast-themes
title: "Support high contrast themes"
summary: "Respect Windows high contrast settings"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L45"
status: active
revision: 1
---

# Support high contrast themes

Respect Windows high contrast settings

**Do:** SystemColors and SystemFonts resources

**Don't:** Hardcoded colors that disappear in high contrast

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
Foreground="{DynamicResource {x:Static SystemColors.ControlTextBrushKey}}"
```

**Bad example:**

```text
Foreground="#333333" everywhere
```
