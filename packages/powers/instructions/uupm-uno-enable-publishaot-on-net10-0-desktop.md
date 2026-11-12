---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-enable-publishaot-on-net10-0-desktop
title: "Enable PublishAot on net10.0-desktop"
summary: "Skia Desktop on .NET 10 supports Native AOT for faster cold start and smaller deployments — opt in per-target so debug builds remain fast"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L55"
status: active
revision: 1
---

# Enable PublishAot on net10.0-desktop

Skia Desktop on .NET 10 supports Native AOT for faster cold start and smaller deployments — opt in per-target so debug builds remain fast

**Do:** <PublishAot>true</PublishAot> in a TFM-conditional PropertyGroup for net10.0-desktop release builds

**Don't:** Enabling PublishAot globally and breaking debug iteration on every TFM

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<PropertyGroup Condition="'$(TargetFramework)'=='net10.0-desktop' AND '$(Configuration)'=='Release'"><PublishAot>true</PublishAot></PropertyGroup>
```

**Bad example:**

```text
<PublishAot>true</PublishAot> at root with no TFM/Configuration condition
```
