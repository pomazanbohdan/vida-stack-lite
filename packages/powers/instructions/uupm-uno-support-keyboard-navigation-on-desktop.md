---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-support-keyboard-navigation-on-desktop
title: "Support keyboard navigation on desktop"
summary: "Skia and WinAppSDK targets need full keyboard operability — note TabIndex routing is not fully implemented on every Uno target"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L48"
status: active
revision: 1
---

# Support keyboard navigation on desktop

Skia and WinAppSDK targets need full keyboard operability — note TabIndex routing is not fully implemented on every Uno target

**Do:** AccessKey and KeyboardAccelerator on Skia and WinAppSDK targets

**Don't:** Mouse-only interactions on desktop

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<Button AccessKey="S" Content="Save"><Button.KeyboardAccelerators><KeyboardAccelerator Modifiers="Control" Key="S"/></Button.KeyboardAccelerators></Button>
```

**Bad example:**

```text
Clickable controls without keyboard support on desktop
```
