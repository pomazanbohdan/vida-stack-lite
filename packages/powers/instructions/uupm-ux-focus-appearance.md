---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-focus-appearance
title: "Focus Appearance"
summary: "WCAG 2.2 AAA defines minimum area and contrast for focus indicators"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for Web interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L103"
status: active
revision: 1
---

# Focus Appearance

WCAG 2.2 AAA defines minimum area and contrast for focus indicators

**Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast

**Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline

**Platform:** Web

**Severity:** Medium

**Good example:**

```text
outline: 2px solid currentColor; outline-offset: 2px
```

**Bad example:**

```text
box-shadow: 0 0 1px low-contrast
```
