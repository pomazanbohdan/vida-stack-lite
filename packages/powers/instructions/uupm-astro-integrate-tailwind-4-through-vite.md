---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-astro-integrate-tailwind-4-through-vite
title: "Integrate Tailwind 4 through Vite"
summary: "The Astro CLI configures Tailwind 4 with the official Vite plugin"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for astro 7.1.6."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6; locator=stacks/astro.csv#L18"
status: active
revision: 1
---

# Integrate Tailwind 4 through Vite

The Astro CLI configures Tailwind 4 with the official Vite plugin

**Do:** Use astro add tailwind or configure @tailwindcss/vite

**Don't:** Add the deprecated @astrojs/tailwind integration

**Applies To:** astro 7.1.6

**Severity:** Low

**Good example:**

```text
npx astro add tailwind
```

**Bad example:**

```text
@astrojs/tailwind
```
