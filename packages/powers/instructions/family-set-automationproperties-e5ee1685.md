---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-set-automationproperties-e5ee1685"
title: "Set AutomationProperties"
summary: "Set AutomationProperties; each stack variant keeps its own guidance."
capability_tags: 
  - "audit-accessibility"
pattern_tags: 
  - "accessibility-compliance"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Set AutomationProperties\",\"summary\":\"Enable screen reader support\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-set-automationproperties\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=c4ba809dbb732fa43c964bbd04f81e60b55c42159c6d2c17ccb67ca6c7040650\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"ab6c6664d0a5c4b19db417abc29bc4dcd0d41a4c326c8f25e9b9388e075accf7\"},{\"title\":\"Set AutomationProperties\",\"summary\":\"Enable screen readers across platforms\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-set-automationproperties\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=d995777f8b795ae80eed20599db04ae52fa6fe2491f11959caec479f55db8149\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"c5aa39f2b52f068ad2869f7b1ae132a86de2c949a9655d4da6cdfe597abd8b7e\"},{\"title\":\"Set AutomationProperties\",\"summary\":\"Enable Narrator and screen reader support\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-set-automationproperties\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=3e18d4fe8ba5b02f3558c0dc4bc9803bbb123d879067062c34d7e00a5aa2f18a\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"bd56c57c3a8bb9b65127b047f9b61673c811039d891a1c7ccb202e8bf9ce45ef\"},{\"title\":\"Set AutomationProperties\",\"summary\":\"Enable Narrator and screen reader support\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-set-automationproperties\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=8880c0350c2d53ccd45b3edf6a1a0415606b8a29030727b6945f12fc42c99a8b\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"53e7deb962c92078170c849520875a55b518644cfabd1d676333818360592423\"},{\"title\":\"Set AutomationProperties\",\"summary\":\"Enable screen reader support\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-set-automationproperties\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=2538f97d361e9a3af787cfbfabb66b1affe7fbc3ebf0a9bdd149ddde60a4404f\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"4351763adc49fd990795a4c512f337299ddf61cdd6d7d154dc628760041bf6d2\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-set-automationproperties -->
# Set AutomationProperties

Enable screen reader support

**Do:** AutomationProperties.Name on interactive controls

**Don't:** Controls without accessible names

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
<Button AutomationProperties.Name="Close dialog"><PathIcon Data="..."/></Button>
```

**Bad example:**

```text
<Button><PathIcon/></Button> without accessible name
```
<!-- sbvf:variant:end uupm-avalonia-set-automationproperties -->
<!-- sbvf:variant:begin uupm-uno-set-automationproperties -->
# Set AutomationProperties

Enable screen readers across platforms

**Do:** AutomationProperties.Name on interactive controls

**Don't:** Controls without accessible names

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<Button AutomationProperties.Name="Submit form"><SymbolIcon Symbol="Accept"/></Button>
```

**Bad example:**

```text
<Button><SymbolIcon Symbol="Accept"/></Button> without name
```
<!-- sbvf:variant:end uupm-uno-set-automationproperties -->
<!-- sbvf:variant:begin uupm-uwp-set-automationproperties -->
# Set AutomationProperties

Enable Narrator and screen reader support

**Do:** AutomationProperties.Name on all interactive controls

**Don't:** Controls without accessible names

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
<AppBarButton AutomationProperties.Name="Save document" Icon="Save"/>
```

**Bad example:**

```text
<AppBarButton Icon="Save"/> without name
```
<!-- sbvf:variant:end uupm-uwp-set-automationproperties -->
<!-- sbvf:variant:begin uupm-winui-set-automationproperties -->
# Set AutomationProperties

Enable Narrator and screen reader support

**Do:** AutomationProperties.Name on all interactive controls

**Don't:** Controls without accessible names

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
<Button AutomationProperties.Name="Save document"><FontIcon Glyph="&#xE74E;"/></Button>
```

**Bad example:**

```text
<Button><FontIcon Glyph="&#xE74E;"/></Button> without name
```
<!-- sbvf:variant:end uupm-winui-set-automationproperties -->
<!-- sbvf:variant:begin uupm-wpf-set-automationproperties -->
# Set AutomationProperties

Enable screen reader support

**Do:** AutomationProperties.Name on interactive controls

**Don't:** Controls without automation names

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
<Button AutomationProperties.Name="Save document"/>
```

**Bad example:**

```text
<Button><Image Source="save.png"/></Button> without name
```
<!-- sbvf:variant:end uupm-wpf-set-automationproperties -->
