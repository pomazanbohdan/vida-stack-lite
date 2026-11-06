---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-content-projection
title: "Use content projection"
summary: "ng-content for flexible component composition"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L6"
status: active
revision: 1
---

# Use content projection

ng-content for flexible component composition

**Do:** ng-content with select for named slots

**Don't:** Rigid templates that can't be customized

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
<ng-content select="[header]" /> <ng-content />
```

**Bad example:**

```text
<div class="header">{{ title }}</div>
```
