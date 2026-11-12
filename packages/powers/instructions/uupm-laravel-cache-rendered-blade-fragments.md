---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-cache-rendered-blade-fragments
title: "Cache rendered Blade fragments"
summary: "Use cache() helper to wrap expensive rendered partials"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L42"
status: active
revision: 1
---

# Cache rendered Blade fragments

Use cache() helper to wrap expensive rendered partials

**Do:** cache() around slow partials that change infrequently

**Don't:** Re-render identical content on every request

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
@php echo cache()->remember('sidebar' 3600 fn() => view('sidebar')->render()); @endphp
```

**Bad example:**

```text
{{ view('sidebar')->render() }} on every page load
```
