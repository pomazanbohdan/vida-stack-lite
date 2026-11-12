---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-use-named-slots-for-legacy-areas
title: "Use named slots for legacy areas"
summary: "Legacy composition with multiple slot elements"
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: "Slots guidance for svelte legacy <=4."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L27"
status: active
revision: 1
---

# Use named slots for legacy areas

Legacy composition with multiple slot elements

**Do:** Retain named slots only in legacy components

**Don't:** Add named slots to new runes-mode code

**Applies To:** svelte legacy <=4

**Severity:** Low

**Good example:**

```text
<slot name="header">
```

**Bad example:**

```text
{@render header()}
```
