---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-handle-loading-states-52f592e1"
title: "Handle loading states"
summary: "Handle loading states explicitly; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "interaction-simplification"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Handle loading states\",\"summary\":\"Show loading indicators\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Async guidance for react-native 0.86.x (official active line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-native-handle-loading-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react-native.csv\",\"rowKey\":\"path=stacks/react-native.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=69f8a005d31783de81aa9f66313186f294cbc590270832a090cb4c136569c224\",\"rawSha256\":\"ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"},\"sourceLabel\":\"react-native 0.86.x (official active line)\",\"applicability\":{\"frameworks\":[{\"name\":\"react-native\",\"versionRange\":{\"raw\":\"0.86.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"0.86.0\"},{\"op\":\"<\",\"version\":\"0.87.0\"}]},\"sourceLabel\":\"react-native 0.86.x (official active line)\"}],\"requiredContext\":[\"framework:react-native\"]},\"contentSha256\":\"e8b6f7ab431bac15d875eed9add6c48b8ac9590c9a8406af2ad31b2f79c4c4e1\"},{\"title\":\"Handle loading states\",\"summary\":\"Use loading.tsx for route loading UI\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Routing guidance for nextjs 16.2.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nextjs-handle-loading-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nextjs.csv\",\"rowKey\":\"path=stacks/nextjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=fe1193ea61bd5c6deb94747207effcb0d0de28a2cc86f0ae5389344cde884519\",\"rawSha256\":\"ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"},\"sourceLabel\":\"nextjs 16.2\",\"applicability\":{\"frameworks\":[{\"name\":\"nextjs\",\"sourceLabel\":\"nextjs 16.2\"}],\"requiredContext\":[\"framework:nextjs\"]},\"contentSha256\":\"9d2fd7c387672a0bd300379a3eb89708693670f23b7283b5eec50a3cbdb3991c\"},{\"title\":\"Handle loading states\",\"summary\":\"Show progress during async operations\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Async guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-handle-loading-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=2beca6f01892b209ae84216fb462f7ebd9bc59ef3bebc9c6d1af9a51c09d0379\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"56274cbb22848b64802dd42136f0475fcb8e62291514dfa7a631fc9726ffb71f\"}]"
---
<!-- sbvf:variant:begin uupm-react-native-handle-loading-states -->
# Handle loading states

Show loading indicators

**Do:** ActivityIndicator during load

**Don't:** Empty screen during load

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
{isLoading ? <ActivityIndicator /> : <Content />}
```

**Bad example:**

```text
No loading state
```
<!-- sbvf:variant:end uupm-react-native-handle-loading-states -->
<!-- sbvf:variant:begin uupm-nextjs-handle-loading-states -->
# Handle loading states

Use loading.tsx for route loading UI

**Do:** loading.tsx alongside page.tsx

**Don't:** Manual loading state management

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
app/dashboard/loading.tsx
```

**Bad example:**

```text
useState for loading in page
```
<!-- sbvf:variant:end uupm-nextjs-handle-loading-states -->
<!-- sbvf:variant:begin uupm-swiftui-handle-loading-states -->
# Handle loading states

Show progress during async operations

**Do:** ProgressView during loading

**Don't:** Empty view during load

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Medium

**Good example:**

```text
if isLoading { ProgressView() }
```

**Bad example:**

```text
No loading indicator
```
<!-- sbvf:variant:end uupm-swiftui-handle-loading-states -->
