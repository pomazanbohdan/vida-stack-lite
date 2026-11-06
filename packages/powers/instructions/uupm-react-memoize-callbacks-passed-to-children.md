---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-memoize-callbacks-passed-to-children
title: "Memoize callbacks passed to children"
summary: "Use useCallback only when callback identity matters for measured child renders."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Rendering guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L13"
status: active
revision: 1
---

# Memoize callbacks passed to children

Use useCallback only when callback identity matters for measured child renders.

**Do:** Use useCallback for handlers passed to memoized children when identity is a bottleneck

**Don't:** Wrap every function in useCallback by default

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
useCallback(() => {}, [deps])
```

**Bad example:**

```text
const handler = () => {}
```
