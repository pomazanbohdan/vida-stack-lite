---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-html-tailwind-declare-non-detected-sources
title: "Declare non-detected sources"
summary: "Tailwind v4 detects source files automatically; use @source only for ignored or external paths"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for html-tailwind 4.3."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee; locator=stacks/html-tailwind.csv#L44"
status: active
revision: 1
---

# Declare non-detected sources

Tailwind v4 detects source files automatically; use @source only for ignored or external paths

**Do:** @source '../node_modules/@acme/ui'

**Don't:** Maintain a legacy content array for ordinary v4 sources

**Applies To:** html-tailwind 4.3

**Severity:** High

**Good example:**

```text
@source '../node_modules/@acme/ui'
```

**Bad example:**

```text
content: ['./src/**/*.{js,ts,jsx,tsx}']
```
