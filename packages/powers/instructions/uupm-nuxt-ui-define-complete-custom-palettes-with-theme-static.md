---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-define-complete-custom-palettes-with-theme-static
title: "Define complete custom palettes with @theme static"
summary: "Nuxt UI custom colors require shades 50 through 950"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Theming guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L12"
status: active
revision: 1
---

# Define complete custom palettes with @theme static

Nuxt UI custom colors require shades 50 through 950

**Do:** Define every --color-brand-* shade in @theme static

**Don't:** Define only one shade for a custom palette

**Applies To:** nuxt-ui 4.11.1

**Severity:** Medium

**Good example:**

```text
@theme static { --color-brand-50: #fff1f2; ... --color-brand-950: #4c0519; }
```

**Bad example:**

```text
@theme { --color-brand-500: #ef4444; }
```
