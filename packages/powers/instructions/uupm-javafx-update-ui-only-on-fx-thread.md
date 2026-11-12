---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-update-ui-only-on-fx-thread
title: "Update UI only on FX thread"
summary: "Scene graph changes must happen on the JavaFX Application Thread"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Threading guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L4"
status: active
revision: 1
---

# Update UI only on FX thread

Scene graph changes must happen on the JavaFX Application Thread

**Do:** Use bindings task handlers or Platform.runLater for UI changes

**Don't:** Mutate controls directly from background threads

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
task.setOnSucceeded(e -> table.setItems(FXCollections.observableArrayList(task.getValue())));
```

**Bad example:**

```text
new Thread(() -> label.setText("Done")).start()
```
