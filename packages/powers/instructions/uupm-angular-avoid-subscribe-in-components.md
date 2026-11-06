---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-avoid-subscribe-in-components
title: "Avoid subscribe in components"
summary: "Subscriptions leak and cause bugs; prefer async pipe or toSignal"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L33"
status: active
revision: 1
---

# Avoid subscribe in components

Subscriptions leak and cause bugs; prefer async pipe or toSignal

**Do:** toSignal() or async pipe instead of manual subscribe

**Don't:** Manual subscribe without unsubscribe in ngOnDestroy

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
readonly data = toSignal(this.service.data$)
```

**Bad example:**

```text
this.service.data$.subscribe(d => this.data = d)
```
