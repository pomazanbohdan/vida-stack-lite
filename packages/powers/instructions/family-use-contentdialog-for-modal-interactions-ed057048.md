---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-contentdialog-for-modal-interactions-ed057048"
title: "Use ContentDialog for modal interactions"
summary: "Use ContentDialog for modal interactions; each stack variant keeps its own guidance."
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
instruction_variants: "[{\"title\":\"Use ContentDialog for modal interactions\",\"summary\":\"Cross-platform modal dialogs using WinUI API\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-contentdialog-for-modal-interactions\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=a45c24f58f89413579d4cc5ee4f0d9870c94447b1139e93b4e7d52f73365c993\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"4ccd2cd2dc42b553ce51eae6eee8f73007162aed9e572db7debe4c8ece19faee\"},{\"title\":\"Use ContentDialog for modal interactions\",\"summary\":\"Standard modal dialog pattern\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-contentdialog-for-modal-interactions\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=ad5b8d3afe8ade0d3bbf5b83f86b63685405635c7c5f2e39e0e835c942ac607a\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"b08ff79b6b819b7d4e0e57a208ca2887fc659f122c44bfa368bbe8cf2825a9bc\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-contentdialog-for-modal-interactions -->
# Use ContentDialog for modal interactions

Cross-platform modal dialogs using WinUI API

**Do:** ContentDialog for confirmations and input

**Don't:** Custom overlay Panel as dialog

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<ContentDialog Title="Confirm" PrimaryButtonText="OK" CloseButtonText="Cancel"/>
```

**Bad example:**

```text
Grid overlay with manual focus trapping
```
<!-- sbvf:variant:end uupm-uno-use-contentdialog-for-modal-interactions -->
<!-- sbvf:variant:begin uupm-winui-use-contentdialog-for-modal-interactions -->
# Use ContentDialog for modal interactions

Standard modal dialog pattern

**Do:** ContentDialog for confirmations and input

**Don't:** Custom overlay Panel as dialog

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<ContentDialog Title="Delete?" PrimaryButtonText="Delete" CloseButtonText="Cancel"/>
```

**Bad example:**

```text
Grid overlay with manual focus trapping
```
<!-- sbvf:variant:end uupm-winui-use-contentdialog-for-modal-interactions -->
