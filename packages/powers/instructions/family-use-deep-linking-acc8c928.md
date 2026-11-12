---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-deep-linking-acc8c928"
title: "Use deep linking"
summary: "Use deep linking; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "interaction-simplification"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use deep linking\",\"summary\":\"Support URL-based navigation\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Navigation guidance for react-native 0.86.x (official active line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-native-use-deep-linking\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react-native.csv\",\"rowKey\":\"path=stacks/react-native.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=2089b23885c5328319c19f40c4a3778bf123083a40daaff800a300278cbe11c6\",\"rawSha256\":\"ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"},\"sourceLabel\":\"react-native 0.86.x (official active line)\",\"applicability\":{\"frameworks\":[{\"name\":\"react-native\",\"versionRange\":{\"raw\":\"0.86.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"0.86.0\"},{\"op\":\"<\",\"version\":\"0.87.0\"}]},\"sourceLabel\":\"react-native 0.86.x (official active line)\"}],\"requiredContext\":[\"framework:react-native\"]},\"contentSha256\":\"2446a3a0b0212d5df65210805adf91f22fcf88dbdbcad98be7ad8018bc42fb51\"},{\"title\":\"Use deep linking\",\"summary\":\"Support URI activation across platforms\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Navigation guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-deep-linking\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=9a000e8dbae742a028ed9138226c4ba81ed1e03f79e4673ee9ad12d37f26f049\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"77a603026dc8f2b9913f0d9f5baaeaeb1bc4b65b09813c322393e3cbf7846523\"},{\"title\":\"Use deep linking\",\"summary\":\"Handle protocol activation so URIs route to the right page\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Navigation guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-deep-linking\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=fe6e4815cd91e7bba58fe7492e9263dba73b994e8870b16d8d39f686b0dd86c0\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"4ab5c654a4cc16290ae52f7f2fcb8dff0443330be6cc21048d5d408df1bbfd5a\"}]"
---
<!-- sbvf:variant:begin uupm-react-native-use-deep-linking -->
# Use deep linking

Support URL-based navigation

**Do:** Configure linking prop

**Don't:** No deep link support

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
linking: { prefixes: [] }
```

**Bad example:**

```text
No linking configuration
```
<!-- sbvf:variant:end uupm-react-native-use-deep-linking -->
<!-- sbvf:variant:begin uupm-uno-use-deep-linking -->
# Use deep linking

Support URI activation across platforms

**Do:** Handle protocol activation and URI routing

**Don't:** Single entry point ignoring activation

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
Route URIs to specific pages on activation
```

**Bad example:**

```text
Ignoring OnLaunched activation args
```
<!-- sbvf:variant:end uupm-uno-use-deep-linking -->
<!-- sbvf:variant:begin uupm-winui-use-deep-linking -->
# Use deep linking

Handle protocol activation so URIs route to the right page

**Do:** Register protocol then check ExtendedActivationKind.Protocol on activation

**Don't:** Single entry point ignoring activation context

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
AppInstance.GetCurrent().GetActivatedEventArgs() with ExtendedActivationKind.Protocol
```

**Bad example:**

```text
Ignoring activation arguments
```
<!-- sbvf:variant:end uupm-winui-use-deep-linking -->
