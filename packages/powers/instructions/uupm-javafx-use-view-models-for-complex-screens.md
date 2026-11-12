---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-view-models-for-complex-screens
title: "Use view models for complex screens"
summary: "View models keep controller state testable and separate from controls"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L42"
status: active
revision: 1
---

# Use view models for complex screens

View models keep controller state testable and separate from controls

**Do:** Expose JavaFX properties from a screen model

**Don't:** Store all state only inside controls

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
customerNameField.textProperty().bindBidirectional(viewModel.nameProperty());
```

**Bad example:**

```text
String name = customerNameField.getText(); // everywhere
```
