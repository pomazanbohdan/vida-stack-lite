---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-numberbox-for-numeric-input
title: "Use NumberBox for numeric input"
summary: "Built-in numeric entry with validation formatting and spin buttons"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Controls guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L46"
status: active
revision: 1
---

# Use NumberBox for numeric input

Built-in numeric entry with validation formatting and spin buttons

**Do:** NumberBox with Minimum Maximum and SpinButtonPlacementMode

**Don't:** TextBox with manual numeric parsing and validation

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<NumberBox Value="{x:Bind Quantity, Mode=TwoWay}" Minimum="0" Maximum="100" SpinButtonPlacementMode="Inline"/>
```

**Bad example:**

```text
TextBox with regex validation for numbers
```
