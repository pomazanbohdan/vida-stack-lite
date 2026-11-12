---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-declare-required-javafx-modules
title: "Declare required JavaFX modules"
summary: "Modular JavaFX apps must require the modules they use"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Modules guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L44"
status: active
revision: 1
---

# Declare required JavaFX modules

Modular JavaFX apps must require the modules they use

**Do:** Add javafx.controls javafx.fxml and opens controller packages

**Don't:** Depend on classpath accidents only

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
module app { requires javafx.controls; requires javafx.fxml; opens app.ui to javafx.fxml; }
```

**Bad example:**

```text
module app { requires javafx.controls; }
```
