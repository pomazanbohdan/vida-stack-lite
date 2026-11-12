---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-implement-inotifypropertychanged-8678305f"
title: "Implement INotifyPropertyChanged"
summary: "Implement INotifyPropertyChanged; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Implement INotifyPropertyChanged\",\"summary\":\"Standard .NET property notification\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-implement-inotifypropertychanged\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=5519b2fe75c412530c9ac224bcc3e190b935a63d907eb5572815a370589765d9\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"915aa3005e665a80881193da847f5e89d17bf6f8946055830b534ad1d5b7c86d\"},{\"title\":\"Implement INotifyPropertyChanged\",\"summary\":\"Enable UI updates when ViewModel properties change\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-implement-inotifypropertychanged\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=887febb2322a61f15ee3b4986ca0d2f02d857b7047c97d65dd470cee49e07fa1\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"91656718ea21bd585e4ab272e1554c5ea9e77e7e9fd7276e85c42095c8c0f51f\"},{\"title\":\"Implement INotifyPropertyChanged\",\"summary\":\"Enable UI updates on property changes\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-implement-inotifypropertychanged\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=d51b1ff2550c9e61ce80069a870ad46bdd917f593188f61b2568a28123ae9b4b\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"04dcfd6c6cadde9195d336e2d739e64af5c515ba30ca24ed8044dbbfa06b5a11\"},{\"title\":\"Implement INotifyPropertyChanged\",\"summary\":\"Enable UI updates when properties change\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-implement-inotifypropertychanged\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f06c6c74306376abfab98530f9df98715dbb1d4e1e454a87ae16084703e499a7\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"ee8433aace73e2455b210a88771dd163adfa890ed9f899de878abf930a0c7bc3\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-implement-inotifypropertychanged -->
# Implement INotifyPropertyChanged

Standard .NET property notification

**Do:** INotifyPropertyChanged or CommunityToolkit.Mvvm

**Don't:** Properties without change notification

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
[ObservableProperty] private string _name;
```

**Bad example:**

```text
public string Name { get; set; } without notification
```
<!-- sbvf:variant:end uupm-avalonia-implement-inotifypropertychanged -->
<!-- sbvf:variant:begin uupm-uno-implement-inotifypropertychanged -->
# Implement INotifyPropertyChanged

Enable UI updates when ViewModel properties change

**Do:** CommunityToolkit.Mvvm [ObservableProperty] for auto-notification

**Don't:** Properties without change notification

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
[ObservableProperty] public partial string Title { get; set; }
```

**Bad example:**

```text
public string Title { get; set; } without notification
```
<!-- sbvf:variant:end uupm-uno-implement-inotifypropertychanged -->
<!-- sbvf:variant:begin uupm-uwp-implement-inotifypropertychanged -->
# Implement INotifyPropertyChanged

Enable UI updates on property changes

**Do:** INotifyPropertyChanged on all ViewModels

**Don't:** Auto-properties without notification

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
public string Title { get => _title; set { _title = value; OnPropertyChanged(); } }
```

**Bad example:**

```text
public string Title { get; set; } expecting UI updates
```
<!-- sbvf:variant:end uupm-uwp-implement-inotifypropertychanged -->
<!-- sbvf:variant:begin uupm-wpf-implement-inotifypropertychanged -->
# Implement INotifyPropertyChanged

Enable UI updates when properties change

**Do:** INotifyPropertyChanged on ViewModels

**Don't:** Public properties without notification

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
public string Name { get => _name; set { if (_name != value) { _name = value; OnPropertyChanged(); } } }
```

**Bad example:**

```text
public string Name { get; set; } without notification
```
<!-- sbvf:variant:end uupm-wpf-implement-inotifypropertychanged -->
