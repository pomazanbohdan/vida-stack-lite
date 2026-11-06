---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-perf-after-non-blocking
title: "After Non-blocking"
summary: "Use Next.js after() to schedule work after response is sent"
capability_tags:
  - optimize-web-performance
pattern_tags:
  - latency-budget
conditions_applies_when: "Server guidance for React/Next.js interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=react-performance.csv; sha256=3d925802539abac5afeb63ae8aa1960b7229ad271b3a47caed40ab2d97ad0734; locator=react-performance.csv#L16"
status: active
revision: 1
---

# After Non-blocking

Use Next.js after() to schedule work after response is sent

**Do:** Use after() for logging/analytics

**Don't:** Block response for non-critical operations

**Platform:** React/Next.js

**Severity:** Medium

**Good example:**

```text
after(async () => { await logAction() }); return Response.json(data)
```

**Bad example:**

```text
await logAction(); return Response.json(data)
```
