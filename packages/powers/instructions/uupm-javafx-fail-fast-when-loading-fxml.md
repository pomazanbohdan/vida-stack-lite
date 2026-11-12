---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-fail-fast-when-loading-fxml
title: "Fail fast when loading FXML"
summary: "FXML load errors should surface during screen creation with clear context"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L9"
status: active
revision: 1
---

# Fail fast when loading FXML

FXML load errors should surface during screen creation with clear context

**Do:** Load resources with getResource and handle IOException explicitly

**Don't:** Swallow loader errors and show a blank scene

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
URL view = getClass().getResource(\/views/main.fxml\"); Parent root = FXMLLoader.load(view);"
```

**Bad example:**

```text
try { FXMLLoader.load(url); } catch(Exception ignored) {}
```
