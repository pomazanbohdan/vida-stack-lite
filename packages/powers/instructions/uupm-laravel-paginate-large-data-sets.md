---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-paginate-large-data-sets
title: "Paginate large data sets"
summary: "Always paginate collections in list views"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L43"
status: active
revision: 1
---

# Paginate large data sets

Always paginate collections in list views

**Do:** ->paginate() or ->simplePaginate() with {{ $items->links() }}

**Don't:** ->get() for large tables in views

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
User::paginate(20) with <x-pagination :links="$users" />
```

**Bad example:**

```text
User::all() passed to Blade
```
