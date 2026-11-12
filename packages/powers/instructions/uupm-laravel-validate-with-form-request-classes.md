---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-validate-with-form-request-classes
title: "Validate with Form Request classes"
summary: "Move validation rules out of controllers into dedicated FormRequest classes"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L35"
status: active
revision: 1
---

# Validate with Form Request classes

Move validation rules out of controllers into dedicated FormRequest classes

**Do:** php artisan make:request and define rules() + authorize()

**Don't:** Inline validate() in controller actions

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
class StorePostRequest extends FormRequest { public function rules() { return ['title' => 'required|max:255']; } }
```

**Bad example:**

```text
public function store(Request $r) { $r->validate(['title' => 'required']); }
```
