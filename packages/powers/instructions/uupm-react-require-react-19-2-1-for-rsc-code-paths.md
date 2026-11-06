---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-require-react-19-2-1-for-rsc-code-paths
title: "Require React 19.2.1+ for RSC code paths"
summary: "React Server Components had an unauthenticated RCE in 19.2.0; treat 19.2.1+ as the security floor."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: "Security guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L61"
status: active
revision: 1
---

# Require React 19.2.1+ for RSC code paths

React Server Components had an unauthenticated RCE in 19.2.0; treat 19.2.1+ as the security floor.

**Do:** Pin React RSC stacks to 19.2.1 or newer

**Don't:** Ship 19.2.0 or older on any RSC endpoint

**Applies To:** react 19.2.x

**Severity:** Critical

**Good example:**

```text
react@19.2.1+ react-dom@19.2.1+
```

**Bad example:**

```text
react@19.2.0
```
