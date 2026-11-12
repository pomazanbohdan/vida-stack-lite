---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-usereducer-for-complex-state-fc948845"
title: "Use useReducer for complex state"
summary: "Use useReducer for complex state transitions; each framework-specific variant keeps its own guidance."
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
instruction_variants: "[{\"title\":\"Use useReducer for complex state\",\"summary\":\"Complex state logic benefits from reducer pattern\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"State guidance for react 19.2.x.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-use-usereducer-for-complex-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react.csv\",\"rowKey\":\"path=stacks/react.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=d81b1e90111c4a4d41979b4347af2ef5299d937949d2ffa0a2af2244735c03a7\",\"rawSha256\":\"4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1\"},\"sourceLabel\":\"react 19.2.x\",\"applicability\":{\"frameworks\":[{\"name\":\"react\",\"versionRange\":{\"raw\":\"19.2.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"19.2.0\"},{\"op\":\"<\",\"version\":\"19.3.0\"}]},\"sourceLabel\":\"react 19.2.x\"}],\"requiredContext\":[\"framework:react\"]},\"contentSha256\":\"d0d311e3e84644e3692210c64bf0e8a106582db65fc38c71aa72636942dcca83\"},{\"title\":\"Use useReducer for complex state\",\"summary\":\"Complex state logic\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"State guidance for react-native 0.86.x (official active line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-native-use-usereducer-for-complex-state\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react-native.csv\",\"rowKey\":\"path=stacks/react-native.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=3591c2c58719f8bd7cb739b312eddba0600b8b42fc5fb9d23b8ff0f77835c6e3\",\"rawSha256\":\"ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"},\"sourceLabel\":\"react-native 0.86.x (official active line)\",\"applicability\":{\"frameworks\":[{\"name\":\"react-native\",\"versionRange\":{\"raw\":\"0.86.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"0.86.0\"},{\"op\":\"<\",\"version\":\"0.87.0\"}]},\"sourceLabel\":\"react-native 0.86.x (official active line)\"}],\"requiredContext\":[\"framework:react-native\"]},\"contentSha256\":\"c17c3e01c5cf7524d13ad99ce76aff89c96c5daae0c14761351b09f20c49494f\"}]"
---
<!-- sbvf:variant:begin uupm-react-use-usereducer-for-complex-state -->
# Use useReducer for complex state

Complex state logic benefits from reducer pattern

**Do:** useReducer for state with multiple sub-values

**Don't:** Multiple useState for related values

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
useReducer with action types
```

**Bad example:**

```text
5+ useState calls that update together
```
<!-- sbvf:variant:end uupm-react-use-usereducer-for-complex-state -->
<!-- sbvf:variant:begin uupm-react-native-use-usereducer-for-complex-state -->
# Use useReducer for complex state

Complex state logic

**Do:** useReducer for related state

**Don't:** Multiple useState for related values

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
useReducer(reducer initialState)
```

**Bad example:**

```text
5+ useState calls
```
<!-- sbvf:variant:end uupm-react-native-use-usereducer-for-complex-state -->
