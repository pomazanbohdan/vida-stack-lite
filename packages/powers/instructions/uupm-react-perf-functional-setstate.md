---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-perf-functional-setstate
title: "Functional setState"
summary: "Use functional setState updates for stable callbacks and no stale closures"
capability_tags:
  - optimize-web-performance
pattern_tags:
  - core-web-vitals
conditions_applies_when: "Rerender guidance for React/Next.js interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=react-performance.csv; sha256=3d925802539abac5afeb63ae8aa1960b7229ad271b3a47caed40ab2d97ad0734; locator=react-performance.csv#L23"
status: active
revision: 1
---

# Functional setState

Use functional setState updates for stable callbacks and no stale closures

**Do:** Use functional form: setState(curr => ...)

**Don't:** Reference state directly in setState

**Platform:** React/Next.js

**Severity:** Medium

**Good example:**

```text
setItems(curr => [...curr, newItem])
```

**Bad example:**

```text
setItems([...items, newItem]) // items in deps
```
