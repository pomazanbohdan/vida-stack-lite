---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-prefer-attached-properties-for-layout
title: "Prefer attached properties for layout"
summary: "Grid.Row Grid.Column DockPanel.Dock etc"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "XAML guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L5"
status: active
revision: 1
---

# Prefer attached properties for layout

Grid.Row Grid.Column DockPanel.Dock etc

**Do:** Attached properties for panel positioning

**Don't:** Margin hacks for alignment

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
<Button Grid.Row="1" Grid.Column="2"/>
```

**Bad example:**

```text
<Button Margin="200,100,0,0"/>
```
