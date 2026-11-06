---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-input-and-output-component-apis
title: "Use input() and output() component APIs"
summary: "Use signal inputs and the output function for typed component contracts"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Components guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L5"
status: active
revision: 1
---

# Use input() and output() component APIs

Use signal inputs and the output function for typed component contracts

**Do:** input() and output() for new component APIs

**Don't:** Decorator-based inputs and outputs in new components

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
name = input<string>(); clicked = output<void>()
```

**Bad example:**

```text
@Input() name: string; @Output() clicked = new EventEmitter()
```
