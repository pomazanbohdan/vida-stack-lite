---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-batch-state-updates
title: "Batch state updates"
summary: "flushSync is a rare escape hatch for synchronous DOM reads/writes."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for react 19.2.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L39"
status: active
revision: 1
---

# Batch state updates

flushSync is a rare escape hatch for synchronous DOM reads/writes.

**Do:** Let React batch related updates; use flushSync only when synchronous DOM work is required

**Don't:** Use flushSync as a normal batching tool

**Applies To:** react 19.2.x

**Severity:** Low

**Good example:**

```text
setA(1); setB(2); // batched
```

**Bad example:**

```text
flushSync(() => setA(1))
```
