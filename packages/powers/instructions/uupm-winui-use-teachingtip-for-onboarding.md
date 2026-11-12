---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-teachingtip-for-onboarding
title: "Use TeachingTip for onboarding"
summary: "Contextual tips attached to UI elements"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L8"
status: active
revision: 1
---

# Use TeachingTip for onboarding

Contextual tips attached to UI elements

**Do:** TeachingTip for feature discovery

**Don't:** Custom popup for teaching

**Applies To:** winui current windows app sdk

**Severity:** Low

**Good example:**

```text
<TeachingTip Target="{x:Bind SearchBox}" Title="Try searching"/>
```

**Bad example:**

```text
Custom Popup positioned near target element
```
