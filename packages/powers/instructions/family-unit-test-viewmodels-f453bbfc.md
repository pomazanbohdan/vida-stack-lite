---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-unit-test-viewmodels-f453bbfc"
title: "Unit test ViewModels"
summary: "Unit test ViewModels; each stack variant keeps its own guidance."
capability_tags: 
  - "write-tests-first"
pattern_tags: 
  - "test-first-development"
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
instruction_variants: "[{\"title\":\"Unit test ViewModels\",\"summary\":\"Test business logic independently\",\"capability_tags\":[\"write-tests-first\"],\"pattern_tags\":[\"test-first-development\"],\"conditions_applies_when\":\"Testing guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-unit-test-viewmodels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=0a5db2b2dee766cc658608e27931c8edc615168e95cbdd4f4d8ea1c5deb67e36\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"6f2b4e9f547023082b0db7f42e29beb5802b48db48b3f0c3f41dd810a7075239\"},{\"title\":\"Unit test ViewModels\",\"summary\":\"Test business logic independently\",\"capability_tags\":[\"write-tests-first\"],\"pattern_tags\":[\"test-first-development\"],\"conditions_applies_when\":\"Testing guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-unit-test-viewmodels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bae90980e06fb3a016901c5cde208482ea94646bd27a6685b47be792aaa32ccf\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"4ba0c6aa9ed1582daa58ebe9bd9306870f0a5b880e6138608050a2e8c08b43e8\"},{\"title\":\"Unit test ViewModels\",\"summary\":\"Test logic without UI framework dependencies\",\"capability_tags\":[\"write-tests-first\"],\"pattern_tags\":[\"test-first-development\"],\"conditions_applies_when\":\"Testing guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-unit-test-viewmodels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=9ee2658e4eed55a52d0f08b9d796ced5d6cb78ac9aeacca0c6e56571196fd889\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"3ab83a3a09b621cff0316f82de14f82e28bced180bcbe3f946078ced2ce614e0\"},{\"title\":\"Unit test ViewModels\",\"summary\":\"Test logic independent of UI framework\",\"capability_tags\":[\"write-tests-first\"],\"pattern_tags\":[\"test-first-development\"],\"conditions_applies_when\":\"Testing guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-unit-test-viewmodels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=7df82d4f7472f64d08e64c71a52a7da83fde6d996b92e85c0444abfb9607f431\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"83613eceb990472bce70259e8fda830e6bfdd42fa68c03f681424da3951fea81\"},{\"title\":\"Unit test ViewModels\",\"summary\":\"Test business logic independent of UI\",\"capability_tags\":[\"write-tests-first\"],\"pattern_tags\":[\"test-first-development\"],\"conditions_applies_when\":\"Testing guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-unit-test-viewmodels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f2ef0354c9b02e0e51532ada8403b0788cd8603a6a17a5e537e88316aba1e47a\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"98a85e8e63f52dfbd9e14751d6dd3611b48267f11c3fb14b29e4da90217de0ca\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-unit-test-viewmodels -->
# Unit test ViewModels

Test business logic independently

**Do:** xUnit or NUnit on ViewModel methods

**Don't:** Testing through UI only

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
[Fact] public void AddItem_IncreasesCount() { vm.AddItem(); Assert.Equal(1, vm.Items.Count); }
```

**Bad example:**

```text
Manual testing by running the app
```
<!-- sbvf:variant:end uupm-avalonia-unit-test-viewmodels -->
<!-- sbvf:variant:begin uupm-uno-unit-test-viewmodels -->
# Unit test ViewModels

Test business logic independently

**Do:** xUnit or MSTest on shared ViewModel code

**Don't:** UI testing only

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
[Fact] public void LoadData_SetsItems() { vm.Load(); Assert.NotEmpty(vm.Items); }
```

**Bad example:**

```text
Manual testing on each platform
```
<!-- sbvf:variant:end uupm-uno-unit-test-viewmodels -->
<!-- sbvf:variant:begin uupm-uwp-unit-test-viewmodels -->
# Unit test ViewModels

Test logic without UI framework dependencies

**Do:** xUnit or MSTest on ViewModel methods

**Don't:** Testing only through the running app

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
[Fact] public async Task Load_PopulatesItems() { await vm.LoadAsync(); Assert.NotEmpty(vm.Items); }
```

**Bad example:**

```text
Manual testing by tapping through the app
```
<!-- sbvf:variant:end uupm-uwp-unit-test-viewmodels -->
<!-- sbvf:variant:begin uupm-winui-unit-test-viewmodels -->
# Unit test ViewModels

Test logic independent of UI framework

**Do:** xUnit or MSTest on ViewModel properties and commands

**Don't:** Testing through UI only

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
[Fact] public async Task LoadItems_PopulatesCollection() { await vm.LoadCommand.ExecuteAsync(null); Assert.NotEmpty(vm.Items); }
```

**Bad example:**

```text
Manual testing by running the app
```
<!-- sbvf:variant:end uupm-winui-unit-test-viewmodels -->
<!-- sbvf:variant:begin uupm-wpf-unit-test-viewmodels -->
# Unit test ViewModels

Test business logic independent of UI

**Do:** xUnit or NUnit tests on ViewModel methods and properties

**Don't:** Manual testing through the UI only

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
[Fact] public void Save_WhenValid_SetsIsBusy() { vm.Save(); Assert.True(vm.IsBusy); }
```

**Bad example:**

```text
Clicking buttons in the running app to verify
```
<!-- sbvf:variant:end uupm-wpf-unit-test-viewmodels -->
