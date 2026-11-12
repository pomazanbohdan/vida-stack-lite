---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-route-model-binding
title: "Use route model binding"
summary: "Laravel resolves models automatically — avoids manual find()"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L45"
status: active
revision: 1
---

# Use route model binding

Laravel resolves models automatically — avoids manual find()

**Do:** Type-hint model in controller method

**Don't:** Manual User::findOrFail($id) in every method

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
public function show(User $user): View { return view('users.show' compact('user')); }
```

**Bad example:**

```text
public function show($id) { $user = User::findOrFail($id); }
```
