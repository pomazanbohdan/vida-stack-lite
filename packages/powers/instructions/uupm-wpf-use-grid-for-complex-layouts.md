---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-grid-for-complex-layouts
title: "Use Grid for complex layouts"
summary: "Rows and columns with proportional or fixed sizing"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L14"
status: active
revision: 1
---

# Use Grid for complex layouts

Rows and columns with proportional or fixed sizing

**Do:** Grid with RowDefinitions and ColumnDefinitions

**Don't:** Canvas with absolute positions for forms

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
<Grid><Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions></Grid>
```

**Bad example:**

```text
<Canvas><TextBox Canvas.Left="50" Canvas.Top="80"/></Canvas>
```
