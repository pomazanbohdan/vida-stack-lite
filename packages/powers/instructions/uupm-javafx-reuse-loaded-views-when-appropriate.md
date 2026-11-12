---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-reuse-loaded-views-when-appropriate
title: "Reuse loaded views when appropriate"
summary: "FXML loading and CSS application are not free"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L40"
status: active
revision: 1
---

# Reuse loaded views when appropriate

FXML loading and CSS application are not free

**Do:** Cache stable views or controllers for frequent navigation

**Don't:** Reload heavyweight screens repeatedly without need

**Applies To:** javafx 26

**Severity:** Low

**Good example:**

```text
Node settings = viewCache.computeIfAbsent("settings", this::loadSettings);
```

**Bad example:**

```text
button.setOnAction(e -> shell.setCenter(loadFxml("settings.fxml")));
```
