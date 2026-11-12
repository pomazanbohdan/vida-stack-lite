---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-add-controlsfx-only-for-missing-enterprise-controls
title: "Add ControlsFX only for missing enterprise controls"
summary: "ControlsFX is useful for specialized controls but should stay optional"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Components guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L57"
status: active
revision: 1
---

# Add ControlsFX only for missing enterprise controls

ControlsFX is useful for specialized controls but should stay optional

**Do:** Use ControlsFX for SpreadsheetView PropertySheet CheckComboBox or StatusBar needs

**Don't:** Add ControlsFX by default before requirements are clear

**Applies To:** javafx 26

**Severity:** Low

**Good example:**

```text
PropertySheet sheet = new PropertySheet(items);
```

**Bad example:**

```text
implementation "org.controlsfx:controlsfx" with no usage
```
