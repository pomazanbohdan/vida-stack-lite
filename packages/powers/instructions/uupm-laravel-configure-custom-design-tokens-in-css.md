---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-configure-custom-design-tokens-in-css
title: "Configure custom design tokens in CSS"
summary: "Define brand colors spacing fonts as CSS variables consumed by Tailwind"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L28"
status: active
revision: 1
---

# Configure custom design tokens in CSS

Define brand colors spacing fonts as CSS variables consumed by Tailwind

**Do:** Custom @theme tokens matched to brand guidelines

**Don't:** Magic color hex codes scattered across Blade templates

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
@theme { --color-brand: oklch(0.6 0.2 250); }
```

**Bad example:**

```text
bg-[#1a2b3c] inline throughout templates
```
