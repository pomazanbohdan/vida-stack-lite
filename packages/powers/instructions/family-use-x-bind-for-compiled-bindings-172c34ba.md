---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-x-bind-for-compiled-bindings-172c34ba"
title: "Use x:Bind for compiled bindings"
summary: "Use x:Bind for compiled bindings; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "design-system-adherence"
  - "state-modeling"
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
instruction_variants: "[{\"title\":\"Use x:Bind for compiled bindings\",\"summary\":\"Compiled bindings eliminate runtime reflection — Uno supports x:Bind across iOS Android WASM Skia and Windows targets that compile XAML so prefer it over {Binding} for static well-typed bindings\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-x-bind-for-compiled-bindings\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=35be4f8cf84d65b7e5f24a4af0180eeee9811ba24494689c0e93a84c2d39865e\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"ab373a0ab3d58bd01d3e3a355f747fb6b52c6646d650a97e4834ec2804a61541\"},{\"title\":\"Use x:Bind for compiled bindings\",\"summary\":\"Compile-time validated bindings with better performance\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"XAML guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-x-bind-for-compiled-bindings\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4f134d33f476ca87d04c77ee858a520c1f493f7e611eaedee6d5a4e0dec9c151\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"eef1e98c3eea634759cd861d3d0436ee6794fcad4d46cf333c24de7210f26600\"},{\"title\":\"Use x:Bind for compiled bindings\",\"summary\":\"Compile-time checked bindings with better performance\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"XAML guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-x-bind-for-compiled-bindings\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=a51631862199f596ebf8b3572d6e779d9cf812c6adee3c9817fe4959e154c103\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"53039652059b35b47c41706aeb802466e2af6b0665976790bfeec59297cfc0f9\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-x-bind-for-compiled-bindings -->
# Use x:Bind for compiled bindings

Compiled bindings eliminate runtime reflection — Uno supports x:Bind across iOS Android WASM Skia and Windows targets that compile XAML so prefer it over {Binding} for static well-typed bindings

**Do:** x:Bind for property and event bindings; reserve {Binding} for runtime-typed DataContext scenarios

**Don't:** {Binding} everywhere when x:Bind would compile

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}"/>
```

**Bad example:**

```text
<TextBlock Text="{Binding Title}"/> for a statically known property
```
<!-- sbvf:variant:end uupm-uno-use-x-bind-for-compiled-bindings -->
<!-- sbvf:variant:begin uupm-uwp-use-x-bind-for-compiled-bindings -->
# Use x:Bind for compiled bindings

Compile-time validated bindings with better performance

**Do:** x:Bind for type-safe performant bindings

**Don't:** {Binding} when x:Bind is available

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
<TextBlock Text="{x:Bind ViewModel.Name, Mode=OneWay}"/>
```

**Bad example:**

```text
<TextBlock Text="{Binding Name}"/>
```
<!-- sbvf:variant:end uupm-uwp-use-x-bind-for-compiled-bindings -->
<!-- sbvf:variant:begin uupm-winui-use-x-bind-for-compiled-bindings -->
# Use x:Bind for compiled bindings

Compile-time checked bindings with better performance

**Do:** x:Bind for type-safe bindings

**Don't:** {Binding} when x:Bind works

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
<TextBlock Text="{x:Bind ViewModel.Title, Mode=OneWay}"/>
```

**Bad example:**

```text
<TextBlock Text="{Binding Title}"/>
```
<!-- sbvf:variant:end uupm-winui-use-x-bind-for-compiled-bindings -->
