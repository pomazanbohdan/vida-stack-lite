---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-native-type-navigation-params
title: "Type navigation params"
summary: "Type-safe navigation"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for react-native 0.86.x (official active line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5; locator=stacks/react-native.csv#L12"
status: active
revision: 1
---

# Type navigation params

Type-safe navigation

**Do:** Typed navigation props

**Don't:** Untyped navigation

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
navigation.navigate<RootStackParamList>('Home', { id })
```

**Bad example:**

```text
navigation.navigate('Home', { id })
```
