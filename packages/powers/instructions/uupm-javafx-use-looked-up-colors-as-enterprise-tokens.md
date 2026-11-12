---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-looked-up-colors-as-enterprise-tokens
title: "Use looked-up colors as enterprise tokens"
summary: "JavaFX looked-up colors keep brand and semantic colors reusable across controls"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Theme guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L50"
status: active
revision: 1
---

# Use looked-up colors as enterprise tokens

JavaFX looked-up colors keep brand and semantic colors reusable across controls

**Do:** Define app-primary app-success app-warning app-danger on root

**Don't:** Repeat hex values in every selector

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
.root { -app-primary: #2563eb; -app-danger: #dc2626; }
```

**Bad example:**

```text
.save { -fx-background-color: #2563eb; } .link { -fx-text-fill: #2563eb; }
```
