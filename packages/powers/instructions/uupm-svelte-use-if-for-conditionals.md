---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-svelte-use-if-for-conditionals
title: "Use {#if} for conditionals"
summary: "Template conditionals"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Logic guidance for svelte 5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db; locator=stacks/svelte.csv#L38"
status: active
revision: 1
---

# Use {#if} for conditionals

Template conditionals

**Do:** {#if} {:else if} {:else}

**Don't:** Ternary in expressions

**Applies To:** svelte 5

**Severity:** Low

**Good example:**

```text
{#if cond}...{:else}...{/if}
```

**Bad example:**

```text
{cond ? a : b} for complex
```
