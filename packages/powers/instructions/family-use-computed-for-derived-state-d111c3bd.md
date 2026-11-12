---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-computed-for-derived-state-d111c3bd"
title: "Use computed for derived state"
summary: "Use computed signals for derived state; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use computed() for derived state\",\"summary\":\"Lazily evaluated derived values that update when dependencies change\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"State guidance for angular 22.x.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-angular-use-computed-for-derived-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/angular.csv\",\"rowKey\":\"path=stacks/angular.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=cfea64a386a58ddf015af88f2fdad4e3120b88daa5eefa109aa3bd1ba4ed6010\",\"rawSha256\":\"704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553\"},\"sourceLabel\":\"angular 22.x\",\"applicability\":{\"frameworks\":[{\"name\":\"angular\",\"versionRange\":{\"raw\":\"22.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"22.0.0\"},{\"op\":\"<\",\"version\":\"23.0.0\"}]},\"sourceLabel\":\"angular 22.x\"}],\"requiredContext\":[\"framework:angular\"]},\"contentSha256\":\"7f8ca0af1935079563f66d48fcee97f05b1d76dfc1d0b89a208c895494d8eaac\"},{\"title\":\"Use computed for derived state\",\"summary\":\"Computed properties cache and update automatically\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Reactivity guidance for vue 3.5.x.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-vue-use-computed-for-derived-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/vue.csv\",\"rowKey\":\"path=stacks/vue.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=fbb3780cab1876863ff242af60a16f41906adfd1bbc4f2a8a1e769dcb6f7ebbf\",\"rawSha256\":\"b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95\"},\"sourceLabel\":\"vue 3.5.x\",\"applicability\":{\"frameworks\":[{\"name\":\"vue\",\"versionRange\":{\"raw\":\"3.5.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"3.5.0\"},{\"op\":\"<\",\"version\":\"3.6.0\"}]},\"sourceLabel\":\"vue 3.5.x\"}],\"requiredContext\":[\"framework:vue\"]},\"contentSha256\":\"1fb94648cfa0e12dfcb9c7fa19a6f0d692bdf479db7b16bfaa1f2522d5efb067\"}]"
---
<!-- sbvf:variant:begin uupm-angular-use-computed-for-derived-state -->
# Use computed() for derived state

Lazily evaluated derived values that update when dependencies change

**Do:** computed() for values derived from other signals

**Don't:** Duplicated state or manual sync

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
readonly total = computed(() => this.items().reduce((s i) => s + i.price 0))
```

**Bad example:**

```text
this.total = this.items.reduce(...) // called manually
```
<!-- sbvf:variant:end uupm-angular-use-computed-for-derived-state -->
<!-- sbvf:variant:begin uupm-vue-use-computed-for-derived-state -->
# Use computed for derived state

Computed properties cache and update automatically

**Do:** computed() for derived values

**Don't:** Methods for derived values

**Applies To:** vue 3.5.x

**Severity:** Medium

**Good example:**

```text
const doubled = computed(() => count.value * 2)
```

**Bad example:**

```text
const doubled = () => count.value * 2
```
<!-- sbvf:variant:end uupm-vue-use-computed-for-derived-state -->
