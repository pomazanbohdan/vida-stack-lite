---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-lightweight-styling-8bff6229"
title: "Use lightweight styling"
summary: "Use lightweight styling; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use Lightweight Styling\",\"summary\":\"Override control sub-properties via resources\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-lightweight-styling\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=c5c93e08ecc385afb15a85a8543b7e2e26525870f73c4a8b3d9353d6c19c827d\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"c6ec8682b590bca655d364dfe9d8b723b2ba8955cb5bb3fd64662d2706222c92\"},{\"title\":\"Use Lightweight Styling\",\"summary\":\"Override control resource keys for subtle changes\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-lightweight-styling\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=52cfce4565125fe6550718aa58476f692698ea60ea8ee64a432faa6da5437652\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"d406c20d24d8034e0df5ec53cef8b1ca1b6779648831d0d2ec637a9f4318c6a4\"},{\"title\":\"Use Lightweight Styling\",\"summary\":\"Override control sub-properties via resources\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-lightweight-styling\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=88ed768f0ec6e0ac1e003cc15c80e98153742b6cca6b887962fafb74077117a1\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"41c65ec8189de2f311be30d9d6293e1d7b52451297fb55a24fa56d21185615d0\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-lightweight-styling -->
# Use Lightweight Styling

Override control sub-properties via resources

**Do:** Lightweight styling keys for minor tweaks

**Don't:** Full ControlTemplate for small changes

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<Button><Button.Resources><StaticResource x:Key="ButtonBackground" ResourceKey="AccentBrush"/></Button.Resources></Button>
```

**Bad example:**

```text
Copying entire ControlTemplate to change one color
```
<!-- sbvf:variant:end uupm-uno-use-lightweight-styling -->
<!-- sbvf:variant:begin uupm-uwp-use-lightweight-styling -->
# Use Lightweight Styling

Override control resource keys for subtle changes

**Do:** Lightweight styling resource overrides

**Don't:** Full ControlTemplate copy for small tweaks

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
<Button><Button.Resources><SolidColorBrush x:Key="ButtonBackground" Color="Blue"/></Button.Resources></Button>
```

**Bad example:**

```text
Entire ControlTemplate copied to change background
```
<!-- sbvf:variant:end uupm-uwp-use-lightweight-styling -->
<!-- sbvf:variant:begin uupm-winui-use-lightweight-styling -->
# Use Lightweight Styling

Override control sub-properties via resources

**Do:** Lightweight styling resource keys to tweak controls

**Don't:** Full ControlTemplate override for small changes

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
<Button><Button.Resources><ResourceDictionary><ResourceDictionary.ThemeDictionaries><ResourceDictionary x:Key="Light"><SolidColorBrush x:Key="ButtonBackground" Color="MediumSlateBlue"/></ResourceDictionary></ResourceDictionary.ThemeDictionaries></ResourceDictionary></Button.Resources></Button>
```

**Bad example:**

```text
Full ControlTemplate copy to change background color
```
<!-- sbvf:variant:end uupm-winui-use-lightweight-styling -->
