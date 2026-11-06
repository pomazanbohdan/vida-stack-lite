---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-avoid-forwardref-in-new-code
title: "Avoid forwardRef in new code"
summary: "forwardRef is deprecated in React 19 and should be treated as legacy compatibility code."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: "Components guidance for react legacy."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L60"
status: active
revision: 1
---

# Avoid forwardRef in new code

forwardRef is deprecated in React 19 and should be treated as legacy compatibility code.

**Do:** Migrate to ref as a prop for new and touched components

**Don't:** Introduce new forwardRef wrappers

**Applies To:** react legacy

**Severity:** High

**Good example:**

```text
legacy wrapper only while migrating older code
```

**Bad example:**

```text
forwardRef for all new components
```
