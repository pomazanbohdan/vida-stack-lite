---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-commandparameter-for-context
title: "Use CommandParameter for context"
summary: "Pass data from the UI element to the command handler"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Commands guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L31"
status: active
revision: 1
---

# Use CommandParameter for context

Pass data from the UI element to the command handler

**Do:** CommandParameter for item-specific actions

**Don't:** Relying on SelectedItem in every command

**Applies To:** wpf current

**Severity:** Low

**Good example:**

```text
<Button Command="{Binding DeleteCommand}" CommandParameter="{Binding}"/>
```

**Bad example:**

```text
Command handler accessing SelectedItem directly
```
