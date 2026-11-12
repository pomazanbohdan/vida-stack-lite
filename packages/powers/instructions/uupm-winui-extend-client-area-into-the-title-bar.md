---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-extend-client-area-into-the-title-bar
title: "Extend client area into the title bar"
summary: "Use Window.ExtendsContentIntoTitleBar with SetTitleBar to host custom XAML in the chrome while preserving caption buttons"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L56"
status: active
revision: 1
---

# Extend client area into the title bar

Use Window.ExtendsContentIntoTitleBar with SetTitleBar to host custom XAML in the chrome while preserving caption buttons

**Do:** ExtendsContentIntoTitleBar=true plus SetTitleBar(element) for custom drag region

**Don't:** Hardcoded chrome height or custom caption buttons that break with theme and size changes

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
this.ExtendsContentIntoTitleBar = true; this.SetTitleBar(AppTitleBar);
```

**Bad example:**

```text
Padding="0,32,0,0" to reserve space without SetTitleBar leaves window non-draggable
```
