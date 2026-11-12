---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-design-tokens-through-looked-up-colors
title: "Use design tokens through looked-up colors"
summary: "Looked-up colors keep palettes consistent across controls"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "CSS guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L11"
status: active
revision: 1
---

# Use design tokens through looked-up colors

Looked-up colors keep palettes consistent across controls

**Do:** Define named colors on root and reuse them in CSS

**Don't:** Repeat hex values in every selector

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
.root { -brand-primary: #2563eb; } .button.primary { -fx-background-color: -brand-primary; }
```

**Bad example:**

```text
.save { -fx-background-color: #2563eb; } .link { -fx-text-fill: #2563eb; }
```
