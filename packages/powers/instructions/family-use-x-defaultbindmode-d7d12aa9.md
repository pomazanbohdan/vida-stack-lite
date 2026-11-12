---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-x-defaultbindmode-d7d12aa9"
title: "Use x:DefaultBindMode"
summary: "Use x:DefaultBindMode; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use x:DefaultBindMode\",\"summary\":\"Reduce repetitive Mode= declarations\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"XAML guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-x-defaultbindmode\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f8db8bdf8bfcdd6903fe618aecb99c71c8b431de7e56f13ee5bc94baffbd677f\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"d8d3bd2987b7bb71ef46ca1b6c7c04c06ae876641d74b34d28754f24e2130661\"},{\"title\":\"Use x:DefaultBindMode\",\"summary\":\"Set default binding mode for a scope\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"XAML guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-x-defaultbindmode\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=8ecc96969debd5de7680054581bda5e17efef64a945932b89c0acf4872d94bf6\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"14425f9b480f7148fcaf02a7c076531c90cbdc878a925c317154b370cffc1897\"}]"
---
<!-- sbvf:variant:begin uupm-uwp-use-x-defaultbindmode -->
# Use x:DefaultBindMode

Reduce repetitive Mode= declarations

**Do:** x:DefaultBindMode=OneWay on containers

**Don't:** Mode=OneWay on every individual x:Bind

**Applies To:** uwp legacy

**Severity:** Low

**Good example:**

```text
<StackPanel x:DefaultBindMode="OneWay">
```

**Bad example:**

```text
Mode=OneWay repeated on every binding in a panel
```
<!-- sbvf:variant:end uupm-uwp-use-x-defaultbindmode -->
<!-- sbvf:variant:begin uupm-winui-use-x-defaultbindmode -->
# Use x:DefaultBindMode

Set default binding mode for a scope

**Do:** x:DefaultBindMode=OneWay on containers with many bindings

**Don't:** Mode=OneWay on every individual x:Bind

**Applies To:** winui current windows app sdk

**Severity:** Low

**Good example:**

```text
<StackPanel x:DefaultBindMode="OneWay">
```

**Bad example:**

```text
Mode=OneWay repeated on 20 bindings
```
<!-- sbvf:variant:end uupm-winui-use-x-defaultbindmode -->
