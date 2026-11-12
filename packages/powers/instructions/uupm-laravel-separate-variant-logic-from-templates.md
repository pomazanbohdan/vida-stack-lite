---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-separate-variant-logic-from-templates
title: "Separate variant logic from templates"
summary: "Keep variant/size/color logic in a PHP class or helper not in Blade"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Components guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L32"
status: active
revision: 1
---

# Separate variant logic from templates

Keep variant/size/color logic in a PHP class or helper not in Blade

**Do:** Variant class or match() expression in component class

**Don't:** Long @if chains for variants inside Blade templates

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
public function classes(): string { return match($this->variant) { 'primary' => 'bg-blue-600', } }
```

**Bad example:**

```text
@if($variant === 'primary') bg-blue-600 @elseif($variant === 'secondary')...
```
