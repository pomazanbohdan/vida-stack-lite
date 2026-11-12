---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-use-on-for-legacy-event-handlers
title: "Use on: for legacy event handlers"
summary: "Event directive syntax for legacy components"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Events guidance for svelte legacy <=4."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L14"
status: active
revision: 1
---

# Use on: for legacy event handlers

Event directive syntax for legacy components

**Do:** on:click only while maintaining legacy mode

**Don't:** Introduce on: handlers in runes mode

**Applies To:** svelte legacy <=4

**Severity:** Medium

**Good example:**

```text
<button on:click={handleClick}>
```

**Bad example:**

```text
<button onclick={handleClick}>
```
