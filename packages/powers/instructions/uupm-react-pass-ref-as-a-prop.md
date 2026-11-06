---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-pass-ref-as-a-prop
title: "Pass ref as a prop"
summary: "React 19 supports ref as a prop; this is the current path for exposing DOM nodes."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: "Components guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L59"
status: active
revision: 1
---

# Pass ref as a prop

React 19 supports ref as a prop; this is the current path for exposing DOM nodes.

**Do:** Accept ref as a normal prop in new components

**Don't:** Reach for forwardRef in new code

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
function Input({ ref, ...props }) { return <input ref={ref} {...props} /> }
```

**Bad example:**

```text
const Input = forwardRef(function Input(props, ref) { ... })
```
