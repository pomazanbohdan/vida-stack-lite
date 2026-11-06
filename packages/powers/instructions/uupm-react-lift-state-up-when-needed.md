---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-lift-state-up-when-needed
title: "Lift state up when needed"
summary: "Share state between siblings by lifting to parent"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "State guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L3"
status: active
revision: 1
---

# Lift state up when needed

Share state between siblings by lifting to parent

**Do:** Lift shared state to common ancestor

**Don't:** Prop drilling through many levels

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
Parent holds state passes down
```

**Bad example:**

```text
Deep prop chains
```
