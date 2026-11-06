---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-use-context-for-global-data
title: "Use context for global data"
summary: "Context for theme auth locale"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Context guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L33"
status: active
revision: 1
---

# Use context for global data

Context for theme auth locale

**Do:** Context for app-wide state

**Don't:** Context for frequently changing data

**Applies To:** react 19.2.x

**Severity:** Medium

**Good example:**

```text
<ThemeContext.Provider>
```

**Bad example:**

```text
Context for form field values
```
