---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-html-tailwind-flexbox-alignment
title: "Flexbox alignment"
summary: "Use flex utilities for alignment"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for html-tailwind 4.3."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee; locator=stacks/html-tailwind.csv#L12"
status: active
revision: 1
---

# Flexbox alignment

Use flex utilities for alignment

**Do:** items-center justify-between

**Don't:** Multiple nested wrappers

**Applies To:** html-tailwind 4.3

**Severity:** Low

**Good example:**

```text
flex items-center justify-between
```

**Bad example:**

```text
Nested divs for alignment
```
