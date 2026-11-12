---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-textformatter-for-constrained-input
title: "Use TextFormatter for constrained input"
summary: "TextFormatter prevents invalid edits before they enter the model"
capability_tags:
  - harden-validation
pattern_tags: []
conditions_applies_when: "Validation guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L32"
status: active
revision: 1
---

# Use TextFormatter for constrained input

TextFormatter prevents invalid edits before they enter the model

**Do:** Attach TextFormatter for numeric dates and masks

**Don't:** Parse and reject invalid text only after submit

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
amountField.setTextFormatter(new TextFormatter<>(new IntegerStringConverter(), 0, c -> c.getControlNewText().matches("\\d*") ? c : null));
```

**Bad example:**

```text
Integer.parseInt(amountField.getText());
```
