---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-commandbar-for-app-actions-466af20d"
title: "Use CommandBar for app actions"
summary: "Use CommandBar for app actions; each stack variant keeps its own guidance."
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
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use CommandBar for app actions\",\"summary\":\"Standard command bar with primary and secondary commands\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-commandbar-for-app-actions\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=b6eeaf23076f558971eb85907d782230cc4264abd17bcbbfa0ce5ef60633f342\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"a32f5f0ad63cce408d68c0bbf50fa1efa6fb20c927fa98dc48260e6bb62cf23a\"},{\"title\":\"Use CommandBar for app actions\",\"summary\":\"Standard app bar for primary commands\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-commandbar-for-app-actions\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=398f38d9134b7979d1a818a034d8e708c19952a921c26f3f99c4b27dd625fc27\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"a9915b99b4c77b9dda711cf31727b1af12a0dd85b8074ff406edf89b0788ac0a\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-commandbar-for-app-actions -->
# Use CommandBar for app actions

Standard command bar with primary and secondary commands

**Do:** CommandBar with AppBarButtons for toolbar actions

**Don't:** Custom StackPanel toolbar

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<CommandBar><AppBarButton Icon="Save" Label="Save"/><AppBarButton Icon="Delete" Label="Delete"/></CommandBar>
```

**Bad example:**

```text
<StackPanel Orientation="Horizontal"><Button>Save</Button></StackPanel>
```
<!-- sbvf:variant:end uupm-uno-use-commandbar-for-app-actions -->
<!-- sbvf:variant:begin uupm-uwp-use-commandbar-for-app-actions -->
# Use CommandBar for app actions

Standard app bar for primary commands

**Do:** CommandBar with AppBarButtons

**Don't:** Custom StackPanel toolbar

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
<CommandBar><AppBarButton Icon="Save" Label="Save"/></CommandBar>
```

**Bad example:**

```text
<StackPanel Orientation="Horizontal"><Button>Save</Button></StackPanel>
```
<!-- sbvf:variant:end uupm-uwp-use-commandbar-for-app-actions -->
