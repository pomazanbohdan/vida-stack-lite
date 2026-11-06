---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-toplevel-storageprovider-for-file-pickers
title: "Use TopLevel.StorageProvider for file pickers"
summary: "The legacy OpenFileDialog/SaveFileDialog APIs are obsolete - use TopLevel.GetTopLevel(this).StorageProvider with OpenFilePickerAsync/SaveFilePickerAsync/OpenFolderPickerAsync which returns IStorageFile/IStorageFolder and works on desktop mobile and browser"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Storage guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L55"
status: active
revision: 1
---

# Use TopLevel.StorageProvider for file pickers

The legacy OpenFileDialog/SaveFileDialog APIs are obsolete - use TopLevel.GetTopLevel(this).StorageProvider with OpenFilePickerAsync/SaveFilePickerAsync/OpenFolderPickerAsync which returns IStorageFile/IStorageFolder and works on desktop mobile and browser

**Do:** TopLevel.StorageProvider with OpenFilePickerAsync and FilePickerOpenOptions

**Don't:** OpenFileDialog or SaveFileDialog from older Avalonia samples or copied from WPF

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
var top = TopLevel.GetTopLevel(this); var files = await top.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions { AllowMultiple = false });
```

**Bad example:**

```text
var dlg = new OpenFileDialog(); var paths = await dlg.ShowAsync(window); // obsolete API
```
