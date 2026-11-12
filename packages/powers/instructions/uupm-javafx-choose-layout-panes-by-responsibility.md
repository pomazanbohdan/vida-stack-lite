---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-choose-layout-panes-by-responsibility
title: "Choose layout panes by responsibility"
summary: "Each pane solves a different layout problem and should be selected intentionally"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L13"
status: active
revision: 1
---

# Choose layout panes by responsibility

Each pane solves a different layout problem and should be selected intentionally

**Do:** Use BorderPane for app shell GridPane for forms VBox/HBox for simple stacks

**Don't:** Use absolute positioning for resizable app screens

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
BorderPane shell = new BorderPane(); shell.setTop(toolbar); shell.setCenter(content);
```

**Bad example:**

```text
Pane root = new Pane(); button.setLayoutX(742);
```
