---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-implicit-styles-for-consistency
title: "Use implicit styles for consistency"
summary: "TargetType without x:Key applies to all instances"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L16"
status: active
revision: 1
---

# Use implicit styles for consistency

TargetType without x:Key applies to all instances

**Do:** Implicit Style for default control appearance

**Don't:** Repeating Setters on every control instance

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
<Style TargetType="Button"><Setter Property="CornerRadius" Value="4"/></Style>
```

**Bad example:**

```text
CornerRadius="4" on every Button in the page
```
