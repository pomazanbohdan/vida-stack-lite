---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-useform-for-form-state-and-submission
title: "Use useForm for form state and submission"
summary: "Inertia's useForm manages progress errors and transforms"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Inertia.js guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L21"
status: active
revision: 1
---

# Use useForm for form state and submission

Inertia's useForm manages progress errors and transforms

**Do:** useForm for all page-level forms, form.post() for submit

**Don't:** Axios/fetch for form submissions on Inertia pages

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
const form = useForm({ name: '' }); form.post('/users');
```

**Bad example:**

```text
axios.post('/users', { name });
```
