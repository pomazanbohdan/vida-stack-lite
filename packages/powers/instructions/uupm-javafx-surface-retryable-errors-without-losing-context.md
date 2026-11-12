---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-surface-retryable-errors-without-losing-context
title: "Surface retryable errors without losing context"
summary: "Network and service failures should preserve user input and next action"
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
  - idempotent-retry-design
conditions_applies_when: "Tasks guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L70"
status: active
revision: 1
---

# Surface retryable errors without losing context

Network and service failures should preserve user input and next action

**Do:** Show inline retry messages and keep form/table state

**Don't:** Clear the screen on service failure

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
message.setDescription("Could not save. Check connection and retry.");
```

**Bad example:**

```text
loadErrorScene();
```
