---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-blade-components-for-reusable-ui
title: "Use Blade components for reusable UI"
summary: "Extract repeated markup into named Blade components"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Blade Templates guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L2"
status: active
revision: 1
---

# Use Blade components for reusable UI

Extract repeated markup into named Blade components

**Do:** Use x-* components with @props for all reusable UI

**Don't:** Duplicate HTML blocks across views

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
<x-card :title="$title">{{ $slot }}</x-card>
```

**Bad example:**

```text
@include('card' ['title' => $title])
```
