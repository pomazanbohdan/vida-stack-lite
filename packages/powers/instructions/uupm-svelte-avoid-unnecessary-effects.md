---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-avoid-unnecessary-effects
title: "Avoid unnecessary effects"
summary: "Not every computation needs $effect"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L48"
status: active
revision: 1
---

# Avoid unnecessary effects

Not every computation needs $effect

**Do:** Use $derived for computed state and $effect only for external synchronization

**Don't:** Use effects for simple assignments

**Applies To:** svelte 5

**Severity:** Low

**Good example:**

```text
let doubled = $derived(count * 2)
```

**Bad example:**

```text
$effect(() => doubled = count * 2)
```
