---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-forward-events-with-on-event-in-legacy-mode
title: "Forward events with on:event in legacy mode"
summary: "Legacy event forwarding without a handler"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L15"
status: active
revision: 1
---

# Forward events with on:event in legacy mode

Legacy event forwarding without a handler

**Do:** on:click only for a legacy component

**Don't:** Use legacy forwarding in runes mode

**Applies To:** svelte legacy <=4

**Severity:** Low

**Good example:**

```text
<button on:click>
```

**Bad example:**

```text
<button onclick={onclick}>
```
