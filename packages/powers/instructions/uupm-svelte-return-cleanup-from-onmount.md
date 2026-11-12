---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-return-cleanup-from-onmount
title: "Return cleanup from onMount"
summary: "Automatic cleanup on destroy"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Lifecycle guidance for svelte 5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L18"
status: active
revision: 1
---

# Return cleanup from onMount

Automatic cleanup on destroy

**Do:** Return function from onMount

**Don't:** Separate onDestroy for paired cleanup

**Applies To:** svelte 5

**Severity:** Medium

**Good example:**

```text
onMount(() => { sub(); return unsub })
```

**Bad example:**

```text
onMount(sub); onDestroy(unsub)
```
