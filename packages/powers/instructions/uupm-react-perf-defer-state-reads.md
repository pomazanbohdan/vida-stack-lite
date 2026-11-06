---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-perf-defer-state-reads
title: "Defer State Reads"
summary: "Don't subscribe to state only used in callbacks"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=react-performance.csv; sha256=3d925802539abac5afeb63ae8aa1960b7229ad271b3a47caed40ab2d97ad0734; locator=react-performance.csv#L19"
status: active
revision: 1
---

# Defer State Reads

Don't subscribe to state only used in callbacks

**Do:** Read state on-demand in callbacks

**Don't:** Subscribe to state used only in handlers

**Platform:** React/Next.js

**Severity:** Medium

**Good example:**

```text
const handleClick = () => { const params = new URLSearchParams(location.search) }
```

**Bad example:**

```text
const params = useSearchParams(); const handleClick = () => { params.get('ref') }
```
