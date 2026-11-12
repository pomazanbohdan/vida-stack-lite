---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-display-validation-errors-with-error
title: "Display validation errors with @error"
summary: "Use the @error directive for inline field-level error messages"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L37"
status: active
revision: 1
---

# Display validation errors with @error

Use the @error directive for inline field-level error messages

**Do:** @error('field') to show per-field messages

**Don't:** Dump $errors->all() in one block at top of form

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
@error('email') <p class="text-red-500">{{ $message }}</p> @enderror
```

**Bad example:**

```text
@foreach($errors->all() as $e) {{ $e }} @endforeach
```
