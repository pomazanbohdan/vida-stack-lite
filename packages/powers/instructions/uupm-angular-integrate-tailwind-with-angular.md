---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-integrate-tailwind-with-angular
title: "Integrate Tailwind with Angular"
summary: "Tailwind utilities work alongside Angular's ViewEncapsulation via global stylesheet"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L45"
status: active
revision: 1
---

# Integrate Tailwind with Angular

Tailwind utilities work alongside Angular's ViewEncapsulation via global stylesheet

**Do:** Add Tailwind in styles.css and use utility classes in templates

**Don't:** Custom CSS for layout that Tailwind already handles

**Applies To:** angular 22.x

**Severity:** Low

**Good example:**

```text
<div class="flex items-center gap-4 p-6">
```

**Bad example:**

```text
<div class="my-custom-flex"> /* .my-custom-flex { display: flex } */
```
