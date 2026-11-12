---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-set-up-tailwind-css-via-vite
title: "Set up Tailwind CSS via Vite"
summary: "Use Vite + tailwindcss plugin for fast HMR and optimized builds"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L24"
status: active
revision: 1
---

# Set up Tailwind CSS via Vite

Use Vite + tailwindcss plugin for fast HMR and optimized builds

**Do:** Install tailwindcss @tailwindcss/vite and configure vite.config.js

**Don't:** Laravel Mix or manual PostCSS pipeline for new projects

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
plugins: [tailwindcss()] in vite.config.js + @import 'tailwindcss' in app.css
```

**Bad example:**

```text
Laravel Mix with require('tailwindcss') in webpack
```
