---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-uno-sdk-with-unofeatures
title: "Use Uno.Sdk with UnoFeatures"
summary: "Uno.Sdk is the modern single-project SDK that auto-resolves Uno.WinUI Uno.Toolkit Material and other packages from a UnoFeatures property — declare features by name instead of hand-managing dozens of PackageReferences"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L58"
status: active
revision: 1
---

# Use Uno.Sdk with UnoFeatures

Uno.Sdk is the modern single-project SDK that auto-resolves Uno.WinUI Uno.Toolkit Material and other packages from a UnoFeatures property — declare features by name instead of hand-managing dozens of PackageReferences

**Do:** Declare features in the csproj via <UnoFeatures>...</UnoFeatures> and let the SDK resolve transitive packages

**Don't:** Hand-adding every Uno.* PackageReference and matching version numbers across packages

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<Project Sdk="Uno.Sdk"><PropertyGroup><UnoFeatures>Material;Hosting;Toolkit;Logging;MVVM</UnoFeatures></PropertyGroup></Project>
```

**Bad example:**

```text
<PackageReference Include="Uno.WinUI"/><PackageReference Include="Uno.Material.WinUI"/> ... duplicated per feature with mismatched versions
```
