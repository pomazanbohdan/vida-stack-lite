---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-test-signal-based-components
title: "Test signal-based components"
summary: "Signals update synchronously; no async flush needed in most cases"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L41"
status: active
revision: 1
---

# Test signal-based components

Signals update synchronously; no async flush needed in most cases

**Do:** Read signal value directly in test assertions

**Don't:** TestBed.tick() or fakeAsync for signal reads

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
component.count.set(5); expect(component.double()).toBe(10)
```

**Bad example:**

```text
fakeAsync(() => { component.count.set(5); tick(); expect(component.double()).toBe(10) })
```
