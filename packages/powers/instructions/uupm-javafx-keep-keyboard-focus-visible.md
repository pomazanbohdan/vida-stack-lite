---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-keep-keyboard-focus-visible
title: "Keep keyboard focus visible"
summary: "Desktop users rely on focus traversal and visible focus indicators"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L29"
status: active
revision: 1
---

# Keep keyboard focus visible

Desktop users rely on focus traversal and visible focus indicators

**Do:** Preserve focus rings and tab order

**Don't:** Remove outlines without alternative focus state

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
.button:focused { -fx-border-color: -brand-focus; -fx-border-width: 2; }
```

**Bad example:**

```text
.button:focused { -fx-background-insets: 0; }
```
