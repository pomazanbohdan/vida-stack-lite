---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-action-handlers-for-commands
title: "Use action handlers for commands"
summary: "Buttons and menu items should route to named command methods"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Events guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L25"
status: active
revision: 1
---

# Use action handlers for commands

Buttons and menu items should route to named command methods

**Do:** Use setOnAction or @FXML handler methods with clear names

**Don't:** Put large lambdas inline for complex operations

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
@FXML private void handleSave(ActionEvent event) { saveCustomer(); }
```

**Bad example:**

```text
saveButton.setOnAction(e -> { validate(); transform(); query(); save(); refresh(); });
```
