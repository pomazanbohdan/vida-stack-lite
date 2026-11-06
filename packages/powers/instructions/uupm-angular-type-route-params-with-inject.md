---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-type-route-params-with-inject
title: "Type route params with inject"
summary: "Use inject(ActivatedRoute) with signals or toSignal"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Routing guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L13"
status: active
revision: 1
---

# Type route params with inject

Use inject(ActivatedRoute) with signals or toSignal

**Do:** Typed route params via ActivatedRoute

**Don't:** Untyped route.snapshot.params string access

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
const id = toSignal(route.paramMap.pipe(map(p => p.get('id'))))
```

**Bad example:**

```text
const id = this.route.snapshot.params['id']
```
