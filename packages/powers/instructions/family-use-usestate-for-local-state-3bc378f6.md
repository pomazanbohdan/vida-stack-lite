---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-usestate-for-local-state-3bc378f6"
title: "Use useState for local state"
summary: "Use useState for simple local component state; each framework-specific variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use useState for local state\",\"summary\":\"Simple component state should use useState hook in current React apps.\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"State guidance for react 19.2.x.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-use-usestate-for-local-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react.csv\",\"rowKey\":\"path=stacks/react.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=7e90506a574c9106985288269aacb4e184a35b035c8237d0f3a1eddf3640160c\",\"rawSha256\":\"4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1\"},\"sourceLabel\":\"react 19.2.x\",\"applicability\":{\"frameworks\":[{\"name\":\"react\",\"versionRange\":{\"raw\":\"19.2.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"19.2.0\"},{\"op\":\"<\",\"version\":\"19.3.0\"}]},\"sourceLabel\":\"react 19.2.x\"}],\"requiredContext\":[\"framework:react\"]},\"contentSha256\":\"b62c3932d5f9015b68cf5d641d0c467c0b5c1dca4cceb3421cdefe72a578574b\"},{\"title\":\"Use useState for local state\",\"summary\":\"Simple component state\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"State guidance for react-native 0.86.x (official active line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-native-use-usestate-for-local-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react-native.csv\",\"rowKey\":\"path=stacks/react-native.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=f1f7ddb34249eebfef7fcea5b80bb2a484a6cefbec8d63e3780c47775d691eea\",\"rawSha256\":\"ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"},\"sourceLabel\":\"react-native 0.86.x (official active line)\",\"applicability\":{\"frameworks\":[{\"name\":\"react-native\",\"versionRange\":{\"raw\":\"0.86.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"0.86.0\"},{\"op\":\"<\",\"version\":\"0.87.0\"}]},\"sourceLabel\":\"react-native 0.86.x (official active line)\"}],\"requiredContext\":[\"framework:react-native\"]},\"contentSha256\":\"37ef12c6b6cb7c24f89c4556a5af627a2071d8621bb6dae96e80ba3f9ef55b00\"}]"
---
<!-- sbvf:variant:begin uupm-react-use-usestate-for-local-state -->
# Use useState for local state

Simple component state should use useState hook in current React apps.

**Do:** useState for form inputs toggles counters

**Don't:** Class components this.state

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
const [count, setCount] = useState(0)
```

**Bad example:**

```text
this.state = { count: 0 }
```
<!-- sbvf:variant:end uupm-react-use-usestate-for-local-state -->
<!-- sbvf:variant:begin uupm-react-native-use-usestate-for-local-state -->
# Use useState for local state

Simple component state

**Do:** useState for UI state

**Don't:** Class component state

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
const [count, setCount] = useState(0)
```

**Bad example:**

```text
this.state = { count: 0 }
```
<!-- sbvf:variant:end uupm-react-native-use-usestate-for-local-state -->
