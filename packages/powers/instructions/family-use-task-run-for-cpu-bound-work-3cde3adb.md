---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-task-run-for-cpu-bound-work-3cde3adb"
title: "Use Task.Run for CPU-bound work"
summary: "Use Task.Run for CPU-bound work; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use Task.Run for CPU-bound work\",\"summary\":\"Offload compute to thread pool\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Threading guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-use-task-run-for-cpu-bound-work\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f904c3fb4d601433d35031ff3027461495849412ea9b6833aed244af07c1136f\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"8d6813fdc7865f55a0b93716c00571fc5a529874e205242639f8874d4892ed1a\"},{\"title\":\"Use Task.Run for CPU-bound work\",\"summary\":\"Offload intensive work from UI thread\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Threading guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-use-task-run-for-cpu-bound-work\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=608d0de6ee84ef420cec606cef08a7527573434b75e7024a511654c5c81c0e48\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"bb7aff5a3c3d08362e24da8c4f6ab7f7c2abf430a5b269089bc6b095ff9c9acf\"}]"
---
<!-- sbvf:variant:begin uupm-winui-use-task-run-for-cpu-bound-work -->
# Use Task.Run for CPU-bound work

Offload compute to thread pool

**Do:** Task.Run for heavy computation

**Don't:** Long-running CPU work on UI thread

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
var result = await Task.Run(() => ProcessLargeDataSet());
```

**Bad example:**

```text
var result = ProcessLargeDataSet(); blocking UI
```
<!-- sbvf:variant:end uupm-winui-use-task-run-for-cpu-bound-work -->
<!-- sbvf:variant:begin uupm-wpf-use-task-run-for-cpu-bound-work -->
# Use Task.Run for CPU-bound work

Offload intensive work from UI thread

**Do:** Task.Run for compute-bound work

**Don't:** Long-running computations on UI thread

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
var result = await Task.Run(() => Compute());
```

**Bad example:**

```text
var result = Compute(); on UI thread
```
<!-- sbvf:variant:end uupm-wpf-use-task-run-for-cpu-bound-work -->
