---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-write-custom-validators-as-functions
title: "Write custom validators as functions"
summary: "Functional validators are composable and tree-shakeable"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L24"
status: active
revision: 1
---

# Write custom validators as functions

Functional validators are composable and tree-shakeable

**Do:** ValidatorFn functions for custom validation

**Don't:** Class-based validators implementing Validator interface

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
const noSpaces: ValidatorFn = ctrl => ctrl.value?.includes(' ') ? { noSpaces: true } : null
```

**Bad example:**

```text
class NoSpacesValidator implements Validator { validate(c) {} }
```
