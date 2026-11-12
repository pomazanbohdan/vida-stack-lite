---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-preserve-old-input-on-validation-failure
title: "Preserve old input on validation failure"
summary: "Use old() to repopulate form fields after server-side error redirect"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L36"
status: active
revision: 1
---

# Preserve old input on validation failure

Use old() to repopulate form fields after server-side error redirect

**Do:** old('field') as default value on all form inputs

**Don't:** Empty form fields when validation fails

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
<input name="email" value="{{ old('email') }}">
```

**Bad example:**

```text
<input name="email">
```
