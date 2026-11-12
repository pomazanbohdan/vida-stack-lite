---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-navigationview-for-app-shell-853b40e1"
title: "Use NavigationView for app shell"
summary: "Use NavigationView for app shell; each stack variant keeps its own guidance."
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
instruction_variants: "[{\"title\":\"Use NavigationView for app shell\",\"summary\":\"WinUI NavigationView for consistent navigation across platforms\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-navigationview-for-app-shell\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=8bc24655fb2b1000e6ecdcad49f9fbcad7afca46c2b07ab355ed63ae8e80e20e\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"61d5149305f2cf49718f36d108b2e76a6478b76ed2556a61e057337206f37231\"},{\"title\":\"Use NavigationView for app shell\",\"summary\":\"Standard UWP navigation pattern with hamburger menu\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Controls guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-navigationview-for-app-shell\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=ad4c9d82eba0937c84dc756e6a7bfbb4b81b23e926a8a45a34d3d36041de20ca\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"5252075df1db912e93735092437257eb4c2acda5c34a5911cc73626646750787\"}]"
---
<!-- sbvf:variant:begin uupm-uno-use-navigationview-for-app-shell -->
# Use NavigationView for app shell

WinUI NavigationView for consistent navigation across platforms

**Do:** NavigationView with MenuItems for app navigation

**Don't:** Custom hamburger menu implementation

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<NavigationView><NavigationView.MenuItems><NavigationViewItem Content="Home" Icon="Home"/></NavigationView.MenuItems></NavigationView>
```

**Bad example:**

```text
Custom SplitView with manual toggle button
```
<!-- sbvf:variant:end uupm-uno-use-navigationview-for-app-shell -->
<!-- sbvf:variant:begin uupm-uwp-use-navigationview-for-app-shell -->
# Use NavigationView for app shell

Standard UWP navigation pattern with hamburger menu

**Do:** NavigationView for top-level navigation

**Don't:** Custom SplitView hamburger menu

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
<NavigationView><NavigationView.MenuItems><NavigationViewItem Content="Home" Icon="Home"/></NavigationView.MenuItems></NavigationView>
```

**Bad example:**

```text
Custom SplitView with manual toggle button
```
<!-- sbvf:variant:end uupm-uwp-use-navigationview-for-app-shell -->
