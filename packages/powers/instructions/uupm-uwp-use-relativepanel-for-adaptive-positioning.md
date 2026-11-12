---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-relativepanel-for-adaptive-positioning
title: "Use RelativePanel for adaptive positioning"
summary: "Controls position relative to each other"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Adaptive guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L38"
status: active
revision: 1
---

# Use RelativePanel for adaptive positioning

Controls position relative to each other

**Do:** RelativePanel for layouts that reflow at breakpoints

**Don't:** Absolute positioning or fixed margins

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
<Button RelativePanel.Below="title" RelativePanel.AlignLeftWithPanel="True"/>
```

**Bad example:**

```text
<Button Margin="0,60,0,0"/> calculated from title height
```
