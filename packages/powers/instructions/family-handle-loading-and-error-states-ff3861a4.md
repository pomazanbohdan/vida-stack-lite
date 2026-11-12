---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-handle-loading-and-error-states-ff3861a4"
title: "Handle loading and error states"
summary: "Handle loading and error states explicitly; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
  - "optimize-web-performance"
pattern_tags: 
  - "critical-render-path"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Handle loading and error states\",\"summary\":\"Complete async UI states\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Async guidance for flutter 3.44.x (current stable line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-flutter-handle-loading-and-error-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/flutter.csv\",\"rowKey\":\"path=stacks/flutter.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=832d8d0962242f019d69a52ad8eb923eaa9c80557e04e08b658c08de6331fae1\",\"rawSha256\":\"64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"},\"sourceLabel\":\"flutter 3.44.x (current stable line)\",\"applicability\":{\"frameworks\":[{\"name\":\"flutter\",\"versionRange\":{\"raw\":\"3.44.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"3.44.0\"},{\"op\":\"<\",\"version\":\"3.45.0\"}]},\"sourceLabel\":\"flutter 3.44.x (current stable line)\"}],\"requiredContext\":[\"framework:flutter\"]},\"contentSha256\":\"2f14ef67237dd41cfe3ef42f59dd69c25bd597a599b63893320baf8c45060204\"},{\"title\":\"Handle loading and error states\",\"summary\":\"Always handle pending and error states\",\"capability_tags\":[\"optimize-web-performance\"],\"pattern_tags\":[\"critical-render-path\"],\"conditions_applies_when\":\"DataFetching guidance for nuxtjs 4.5.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nuxtjs-handle-loading-and-error-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nuxtjs.csv\",\"rowKey\":\"path=stacks/nuxtjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f3b7838856c4c018d2507da51470c47aac5384b518bdc43c45671240f0e177fa\",\"rawSha256\":\"3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"},\"sourceLabel\":\"nuxtjs 4.5\",\"applicability\":{\"frameworks\":[{\"name\":\"nuxtjs\",\"sourceLabel\":\"nuxtjs 4.5\"}],\"requiredContext\":[\"framework:nuxtjs\"]},\"contentSha256\":\"f516d0e148c2e8993dae0fb7bc0616d150c987a5cdc7389df3e8700af827130a\"}]"
---
<!-- sbvf:variant:begin uupm-flutter-handle-loading-and-error-states -->
# Handle loading and error states

Complete async UI states

**Do:** ConnectionState checks

**Don't:** Only success state

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** High

**Good example:**

```text
if (snapshot.connectionState == ConnectionState.waiting)
```

**Bad example:**

```text
No loading indicator
```
<!-- sbvf:variant:end uupm-flutter-handle-loading-and-error-states -->
<!-- sbvf:variant:begin uupm-nuxtjs-handle-loading-and-error-states -->
# Handle loading and error states

Always handle pending and error states

**Do:** Check status pending error refs

**Don't:** Ignoring loading states

**Applies To:** nuxtjs 4.5

**Severity:** High

**Good example:**

```text
<div v-if="status === 'pending'">Loading...</div>
```

**Bad example:**

```text
No loading indicator
```
<!-- sbvf:variant:end uupm-nuxtjs-handle-loading-and-error-states -->
