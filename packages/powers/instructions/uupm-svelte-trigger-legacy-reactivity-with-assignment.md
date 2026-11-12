---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-trigger-legacy-reactivity-with-assignment
title: "Trigger legacy reactivity with assignment"
summary: "Legacy-mode reactivity tracks assignments"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Reactivity guidance for svelte legacy <=4."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L3"
status: active
revision: 1
---

# Trigger legacy reactivity with assignment

Legacy-mode reactivity tracks assignments

**Do:** Reassign arrays or objects in legacy mode

**Don't:** Treat assignment as the Svelte 5 runes contract

**Applies To:** svelte legacy <=4

**Severity:** High

**Good example:**

```text
items = [...items, newItem]
```

**Bad example:**

```text
let items = $state([])
```
