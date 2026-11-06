---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-pseudoclass-selectors-for-states
title: "Use pseudoclass selectors for states"
summary: "Target control states with colon syntax"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L7"
status: active
revision: 1
---

# Use pseudoclass selectors for states

Target control states with colon syntax

**Do:** :pointerover :pressed :focus for interactive states

**Don't:** VisualStateManager or Triggers

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<Style Selector="Button:pointerover"><Setter Property="Opacity" Value="0.8"/></Style>
```

**Bad example:**

```text
<VisualStateManager> for hover effects
```
