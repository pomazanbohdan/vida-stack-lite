---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-winui-theme-resources-758df824"
title: "Use WinUI theme resources"
summary: "Use WinUI theme resources; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "design-system-adherence"
conditions_applies_when: "Applies when the selected framework variant matches."
conditions_does_not_apply_when: "The framework is not one of the declared variants or the variant exception applies."
artifact_contract_output_type: "none"
artifact_contract_required_data: []
artifact_contract_verified_by: "Each selected variant retains its source-specific contract and is checked against its source-bound guidance."
compatibility_excludes: []
compatibility_requires: []
roles: []
products: []
provenance: 
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use WinUI theme resources\",\"summary\":\"Consistent theming across platforms\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-winui-theme-resources\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=86a6ea9c37585bb036a204c19d47a7d252e5e74772ca7180500dd46639def3fc\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"4ab41a9e5f029041ec33e40199d0153c18759b230602d0441c071f3d2b67bed9\"},{\"title\":\"Use WinUI theme resources\",\"summary\":\"Consistent Fluent Design colors and brushes\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-winui-theme-resources\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=071d4e8ee9980774c12b209d5043c640dff88e58b3887e290146a5fb17e9e361\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"934a3d08baedc2cd02ed05ee220818fdb7232c60e01cade43b6e82892a0e39ec\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-winui-theme-resources -->
# Use WinUI theme resources

Consistent theming across platforms

**Do:** ThemeResource for adaptive colors

**Don't:** Hardcoded colors per platform

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
Background="{ThemeResource ApplicationPageBackgroundThemeBrush}"
```

**Bad example:**

```text
Background="#FFFFFF"
```
<!-- sbvf:variant:end uupm-uno-use-winui-theme-resources -->
<!-- sbvf:variant:begin uupm-winui-use-winui-theme-resources -->
# Use WinUI theme resources

Consistent Fluent Design colors and brushes

**Do:** WinUI theme resource keys for colors

**Don't:** Hardcoded hex color values

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
```

**Bad example:**

```text
Background="#FF2D2D30"
```
<!-- sbvf:variant:end uupm-winui-use-winui-theme-resources -->
