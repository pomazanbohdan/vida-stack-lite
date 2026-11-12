---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-retune-library-motion-with-theme-easing-tokens
title: "Retune library motion with theme easing tokens"
summary: "Nuxt UI 4.11 uses --ease-out for enter, exit, and movement transitions"
capability_tags:
  - design-microinteraction
pattern_tags:
  - choreographed-motion
conditions_applies_when: "Motion guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L75"
status: active
revision: 1
---

# Retune library motion with theme easing tokens

Nuxt UI 4.11 uses --ease-out for enter, exit, and movement transitions

**Do:** Override --ease-out in @theme to retime motion consistently

**Don't:** Override transition timing independently on every component

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
@theme { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); }
```

**Bad example:**

```text
.modal { transition-timing-function: ... } repeated per component
```
