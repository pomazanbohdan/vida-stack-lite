---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-native-use-context-sparingly
title: "Use context sparingly"
summary: "Context for global state"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "State guidance for react-native 0.86.x (official active line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5; locator=stacks/react-native.csv#L17"
status: active
revision: 1
---

# Use context sparingly

Context for global state

**Do:** Context for theme auth locale

**Don't:** Context for frequently changing data

**Applies To:** react-native 0.86.x (official active line)

**Severity:** Medium

**Good example:**

```text
ThemeContext for app theme
```

**Bad example:**

```text
Context for list item data
```
