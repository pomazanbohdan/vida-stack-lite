---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-frame-for-page-navigation-65ba670c"
title: "Use Frame for page navigation"
summary: "Use Frame for page navigation; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use Frame for page navigation\",\"summary\":\"Windows.UI.Xaml.Controls.Frame for UWP page navigation\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Navigation guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-frame-for-page-navigation\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=a02594ed3953d159c417c6118c65ccf302b9b91ad2870238ed450cdd7e1a3fff\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"06abac130ff36b83116b926921d9dd6cd15ed06197d64e718e4a7604349a0d10\"},{\"title\":\"Use Frame for page navigation\",\"summary\":\"Microsoft.UI.Xaml.Controls.Frame for WinUI 3 page navigation\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Navigation guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-frame-for-page-navigation\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=9449bb20468079b9dee7da6442c5aaf266761e0dbd45479d09be0b81c750697b\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"60cb6cd966444bbf1953182fadc778b16a1df57bba8500c1ccf2b2d35320ceb9\"}]"
---
<!-- sbvf:variant:begin uupm-uwp-use-frame-for-page-navigation -->
# Use Frame for page navigation

Windows.UI.Xaml.Controls.Frame for UWP page navigation

**Do:** Frame.Navigate with typed parameters

**Don't:** Swapping UserControls manually

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
rootFrame.Navigate(typeof(DetailPage), itemId);
```

**Bad example:**

```text
contentArea.Content = new DetailPage();
```
<!-- sbvf:variant:end uupm-uwp-use-frame-for-page-navigation -->
<!-- sbvf:variant:begin uupm-winui-use-frame-for-page-navigation -->
# Use Frame for page navigation

Microsoft.UI.Xaml.Controls.Frame for WinUI 3 page navigation

**Do:** Frame.Navigate with page types and parameters

**Don't:** Swapping UserControls in a ContentControl

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
rootFrame.Navigate(typeof(SettingsPage), parameter);
```

**Bad example:**

```text
contentArea.Content = new SettingsControl();
```
<!-- sbvf:variant:end uupm-winui-use-frame-for-page-navigation -->
