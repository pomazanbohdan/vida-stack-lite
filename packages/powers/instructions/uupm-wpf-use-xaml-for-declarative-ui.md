---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-xaml-for-declarative-ui
title: "Use XAML for declarative UI"
summary: "Define layout and visuals in XAML not code-behind"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L2"
status: active
revision: 1
---

# Use XAML for declarative UI

Define layout and visuals in XAML not code-behind

**Do:** XAML for structure and styling

**Don't:** Build UI trees in C# code-behind

**Applies To:** wpf current

**Severity:** Low

**Good example:**

```text
<Button Content="Save" Click="OnSave"/>
```

**Bad example:**

```text
var btn = new Button(); btn.Content = "Save";
```
