---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-observablecollection-for-lists-8b7c19b8"
title: "Use ObservableCollection for lists"
summary: "Use ObservableCollection for lists; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use ObservableCollection for lists\",\"summary\":\"UI updates on collection changes\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-use-observablecollection-for-lists\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=c534a08be61bfa541f5f05d5278fd469a947dbdb78398a32716f2fa8b4ea0eef\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"3ea54fec25d480eb51d9d641929566891151942f1233653f337bacbdad53981a\"},{\"title\":\"Use ObservableCollection for lists\",\"summary\":\"Collection change notifications for ItemsSources\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for uwp legacy.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uwp-use-observablecollection-for-lists\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uwp.csv\",\"rowKey\":\"path=stacks/uwp.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=845881ad3b509ff8e96d8689f449f43aac4556ad1b669a09bd2cd06e34cafec0\",\"rawSha256\":\"c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c\"},\"sourceLabel\":\"uwp legacy\",\"applicability\":{\"frameworks\":[{\"name\":\"uwp\",\"sourceLabel\":\"uwp legacy\"}],\"requiredContext\":[\"framework:uwp\"]},\"contentSha256\":\"70c3e9e5de5109570778a03b81cf0bf3432a5d8fd95b3634ee45ad4edbafb750\"},{\"title\":\"Use ObservableCollection for lists\",\"summary\":\"Notifies UI of collection changes\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-observablecollection-for-lists\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=680a0a81edb012ec822563eab8675499d91a19dc2342504844f70061923d8279\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"b29e4d2e3c09ac9d0e859ea9c2d7e8198575ae17ee96ac39a6d3b73261bf235e\"},{\"title\":\"Use ObservableCollection for lists\",\"summary\":\"Notifies UI of add remove and reset\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Data Binding guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-use-observablecollection-for-lists\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=eb7b34f0c2237153dc9681464583d690e10a9a0670c3059b62b4dec0bacb9917\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"988899ff7cad7bd54d440e2aa1ab3ac387679836411a181ca46ecc7bc16408bf\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-use-observablecollection-for-lists -->
# Use ObservableCollection for lists

UI updates on collection changes

**Do:** ObservableCollection<T> for bound collections

**Don't:** List<T> for ItemsSources

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
ObservableCollection<Item> Items { get; } = new();
```

**Bad example:**

```text
List<Item> Items { get; set; }
```
<!-- sbvf:variant:end uupm-avalonia-use-observablecollection-for-lists -->
<!-- sbvf:variant:begin uupm-uwp-use-observablecollection-for-lists -->
# Use ObservableCollection for lists

Collection change notifications for ItemsSources

**Do:** ObservableCollection<T> for bound lists

**Don't:** List<T> for data-bound collections

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
ObservableCollection<Item> Items { get; } = new();
```

**Bad example:**

```text
List<Item> Items { get; set; } = new();
```
<!-- sbvf:variant:end uupm-uwp-use-observablecollection-for-lists -->
<!-- sbvf:variant:begin uupm-winui-use-observablecollection-for-lists -->
# Use ObservableCollection for lists

Notifies UI of collection changes

**Do:** ObservableCollection<T> for bound ItemsSources

**Don't:** List<T> for bound collections

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
ObservableCollection<Item> Items { get; } = new();
```

**Bad example:**

```text
List<Item> Items { get; set; } = new();
```
<!-- sbvf:variant:end uupm-winui-use-observablecollection-for-lists -->
<!-- sbvf:variant:begin uupm-wpf-use-observablecollection-for-lists -->
# Use ObservableCollection for lists

Notifies UI of add remove and reset

**Do:** ObservableCollection<T> for bound collections

**Don't:** List<T> or Array for bound ItemsSources

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
ObservableCollection<Item> Items { get; } = new();
```

**Bad example:**

```text
List<Item> Items { get; set; } = new();
```
<!-- sbvf:variant:end uupm-wpf-use-observablecollection-for-lists -->
