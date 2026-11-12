---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-method-spoofing-for-put-patch-delete
title: "Use method spoofing for PUT/PATCH/DELETE"
summary: "HTML forms only support GET/POST — use @method for REST actions"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L39"
status: active
revision: 1
---

# Use method spoofing for PUT/PATCH/DELETE

HTML forms only support GET/POST — use @method for REST actions

**Do:** @method('PUT') inside form for update/delete routes

**Don't:** Route::post for all mutations including updates

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
<form method="POST">@csrf @method('PUT')
```

**Bad example:**

```text
<form method="POST" action="/users/update">
```
