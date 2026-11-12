---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-mvvm-pattern-4aaa7775"
title: "Use MVVM pattern"
summary: "Use MVVM pattern; each stack variant keeps its own guidance."
capability_tags: 
  - "design-structure"
pattern_tags: 
  - "structural-design"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use MVVM pattern\",\"summary\":\"Separate view and logic\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-use-mvvm-pattern\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=8915e9d67b7320f9feaaf4657ae04aec77c7e54c23c674ed8d0438c08dea1e04\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"4e94a17c8107da664a878ba90b026ee32a686d837a4a8aecc218e61f944fef2b\"},{\"title\":\"Use MVVM pattern\",\"summary\":\"Separate view and logic\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-use-mvvm-pattern\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4172a9e535181e0619f669a9239d336435b18ed3c41ad362fc5cdea52e20a72e\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"90357972654109302669c09174f415cabecad19bb631610354cf2db26e4dc7ab\"},{\"title\":\"Use MVVM pattern\",\"summary\":\"Separate View ViewModel and Model\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-mvvm-pattern\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4b1bf8e6d862f0e9814890026763ec7ecb422f191c42d4d1c44a115896c5eb24\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"a2eefe53429d202f2719a804adf891a2cf0dc8d1025eb1fee817b747f21bd401\"},{\"title\":\"Use MVVM pattern\",\"summary\":\"Separate View ViewModel and Model concerns\",\"capability_tags\":[\"design-structure\"],\"pattern_tags\":[\"structural-design\"],\"conditions_applies_when\":\"Architecture guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-use-mvvm-pattern\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=465d5d8e328395acfa1d9e13a810c122c57dad90aafd985a985a54f6b82d891a\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"3c5c3cf3313809328ed49b71a3d7db03237d438ec90ea226e10c483c0574a9b4\"}]"
---
<!-- sbvf:variant:begin uupm-swiftui-use-mvvm-pattern -->
# Use MVVM pattern

Separate view and logic

**Do:** ViewModel for business logic

**Don't:** Logic in View

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Medium

**Good example:**

```text
ObservableObject ViewModel
```

**Bad example:**

```text
@State for complex logic
```
<!-- sbvf:variant:end uupm-swiftui-use-mvvm-pattern -->
<!-- sbvf:variant:begin uupm-uno-use-mvvm-pattern -->
# Use MVVM pattern

Separate view and logic

**Do:** CommunityToolkit.Mvvm or Prism for MVVM

**Don't:** Code-behind for business logic

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
[ObservableProperty] public partial string Title { get; set; } [RelayCommand] private void Save() { }
```

**Bad example:**

```text
MainPage.xaml.cs with all logic
```
<!-- sbvf:variant:end uupm-uno-use-mvvm-pattern -->
<!-- sbvf:variant:begin uupm-uwp-use-mvvm-pattern -->
# Use MVVM pattern

Separate View ViewModel and Model

**Do:** ViewModel with INotifyPropertyChanged and ICommand

**Don't:** Business logic in code-behind

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
ViewModel bound via DataContext with commands
```

**Bad example:**

```text
MainPage.xaml.cs with database calls and UI logic
```
<!-- sbvf:variant:end uupm-uwp-use-mvvm-pattern -->
<!-- sbvf:variant:begin uupm-wpf-use-mvvm-pattern -->
# Use MVVM pattern

Separate View ViewModel and Model concerns

**Do:** MVVM with data binding and commands

**Don't:** Logic in code-behind

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
ViewModel with INotifyPropertyChanged and ICommand
```

**Bad example:**

```text
MainWindow.xaml.cs with all business logic
```
<!-- sbvf:variant:end uupm-wpf-use-mvvm-pattern -->
