---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-trackby-in-for-blocks
title: "Use trackBy in @for blocks"
summary: "Stable identity for list items prevents full DOM re-creation on change"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L29"
status: active
revision: 1
---

# Use trackBy in @for blocks

Stable identity for list items prevents full DOM re-creation on change

**Do:** track item.id in @for

**Don't:** track $index for dynamic data

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
@for (item of items; track item.id) { <li>{{ item.name }}</li> }
```

**Bad example:**

```text
@for (item of items; track $index) { <li>{{ item.name }}</li> }
```
