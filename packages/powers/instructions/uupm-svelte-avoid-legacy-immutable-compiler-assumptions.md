---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-avoid-legacy-immutable-compiler-assumptions
title: "Avoid legacy immutable compiler assumptions"
summary: "Runes use fine-grained reactivity without the legacy immutable option"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for svelte 5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L49"
status: active
revision: 1
---

# Avoid legacy immutable compiler assumptions

Runes use fine-grained reactivity without the legacy immutable option

**Do:** Use current runes state and measure real bottlenecks

**Don't:** Add immutable mode to new runes components

**Applies To:** svelte 5

**Severity:** Low

**Good example:**

```text
$state for reactive data
```

**Bad example:**

```text
<svelte:options immutable/>
```
