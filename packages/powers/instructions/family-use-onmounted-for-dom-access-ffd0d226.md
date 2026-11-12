---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-onmounted-for-dom-access-ffd0d226"
title: "Use onMounted for DOM access"
summary: "Use onMounted for DOM access; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use onMounted for DOM access\",\"summary\":\"Access DOM only after component is mounted\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Lifecycle guidance for nuxtjs 4.5.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nuxtjs-use-onmounted-for-dom-access\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nuxtjs.csv\",\"rowKey\":\"path=stacks/nuxtjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bd758d6e34d676996f0e7b4ae6430f5e8e818218d664fe203eca8279e8bb6a83\",\"rawSha256\":\"3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"},\"sourceLabel\":\"nuxtjs 4.5\",\"applicability\":{\"frameworks\":[{\"name\":\"nuxtjs\",\"sourceLabel\":\"nuxtjs 4.5\"}],\"requiredContext\":[\"framework:nuxtjs\"]},\"contentSha256\":\"11df48e588ad88a34fc76bf1614f47ed41e43e87d439320b9a4982944677cbba\"},{\"title\":\"Use onMounted for DOM access\",\"summary\":\"DOM is ready in onMounted\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Lifecycle guidance for vue 3.5.x.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-vue-use-onmounted-for-dom-access\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/vue.csv\",\"rowKey\":\"path=stacks/vue.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=5cfe2bb6bd592bdcb4e8304f3c628792834054345519bab58df8d2dfdd8d90f7\",\"rawSha256\":\"b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95\"},\"sourceLabel\":\"vue 3.5.x\",\"applicability\":{\"frameworks\":[{\"name\":\"vue\",\"versionRange\":{\"raw\":\"3.5.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"3.5.0\"},{\"op\":\"<\",\"version\":\"3.6.0\"}]},\"sourceLabel\":\"vue 3.5.x\"}],\"requiredContext\":[\"framework:vue\"]},\"contentSha256\":\"78f0017781096ad0192c576ff2d6a9330cba466513626addd761e9327c50d32a\"}]"
---
<!-- sbvf:variant:begin uupm-nuxtjs-use-onmounted-for-dom-access -->
# Use onMounted for DOM access

Access DOM only after component is mounted

**Do:** onMounted for DOM manipulation

**Don't:** Direct DOM access in setup

**Applies To:** nuxtjs 4.5

**Severity:** High

**Good example:**

```text
onMounted(() => { document.getElementById('el') })
```

**Bad example:**

```text
<script setup>document.getElementById('el')</script>
```
<!-- sbvf:variant:end uupm-nuxtjs-use-onmounted-for-dom-access -->
<!-- sbvf:variant:begin uupm-vue-use-onmounted-for-dom-access -->
# Use onMounted for DOM access

DOM is ready in onMounted

**Do:** onMounted for DOM operations

**Don't:** Access DOM in setup directly

**Applies To:** vue 3.5.x

**Severity:** High

**Good example:**

```text
onMounted(() => el.value.focus())
```

**Bad example:**

```text
el.value.focus() in setup
```
<!-- sbvf:variant:end uupm-vue-use-onmounted-for-dom-access -->
