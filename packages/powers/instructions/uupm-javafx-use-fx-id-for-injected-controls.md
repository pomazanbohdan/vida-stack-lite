---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-fx-id-for-injected-controls
title: "Use fx:id for injected controls"
summary: "FXML controls need stable fx:id values that match controller fields"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "FXML guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L8"
status: active
revision: 1
---

# Use fx:id for injected controls

FXML controls need stable fx:id values that match controller fields

**Do:** Annotate fields with @FXML and keep ids descriptive

**Don't:** Look up controls by CSS selector for normal wiring

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
@FXML private TableView<Customer> customerTable;
```

**Bad example:**

```text
root.lookup("#customerTable")
```
