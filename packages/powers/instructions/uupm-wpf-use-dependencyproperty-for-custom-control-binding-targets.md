---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-dependencyproperty-for-custom-control-binding-targets
title: "Use DependencyProperty for custom-control binding targets"
summary: "Binding target properties on custom controls must be DependencyProperties (sources can be plain CLR properties with INPC)"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L35"
status: active
revision: 1
---

# Use DependencyProperty for custom-control binding targets

Binding target properties on custom controls must be DependencyProperties (sources can be plain CLR properties with INPC)

**Do:** Define DependencyProperty for properties bound TO on a custom control

**Don't:** Plain CLR properties as binding targets on custom controls

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
public static readonly DependencyProperty NameProperty = ...
```

**Bad example:**

```text
public string Name { get; set; } as binding target on custom control
```
