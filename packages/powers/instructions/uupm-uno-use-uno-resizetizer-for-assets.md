---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-uno-resizetizer-for-assets
title: "Use Uno.Resizetizer for assets"
summary: "Single source SVG to multi-platform assets"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L30"
status: active
revision: 1
---

# Use Uno.Resizetizer for assets

Single source SVG to multi-platform assets

**Do:** UnoImage for automatic asset generation from SVG

**Don't:** Manual asset export per resolution and platform

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<UnoImage Include="Assets/icon.svg" BaseSize="24,24"/>
```

**Bad example:**

```text
Manually exporting icon_1x.png icon_2x.png icon_3x.png per platform
```
