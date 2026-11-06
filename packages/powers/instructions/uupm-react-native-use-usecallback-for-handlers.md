---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-native-use-usecallback-for-handlers
title: "Use useCallback for handlers"
summary: "Stable function references"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for react-native 0.86.x (official active line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5; locator=stacks/react-native.csv#L25"
status: active
revision: 1
---

# Use useCallback for handlers

Stable function references

**Do:** useCallback for props

**Don't:** New function on every render

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
useCallback(() => {}, [deps])
```

**Bad example:**

```text
() => handlePress()
```
