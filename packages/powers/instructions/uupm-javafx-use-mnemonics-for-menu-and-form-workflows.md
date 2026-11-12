---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-mnemonics-for-menu-and-form-workflows
title: "Use mnemonics for menu and form workflows"
summary: "Mnemonics make desktop workflows faster and more accessible"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L30"
status: active
revision: 1
---

# Use mnemonics for menu and form workflows

Mnemonics make desktop workflows faster and more accessible

**Do:** Enable mnemonicParsing and choose unique mnemonic letters

**Don't:** Ignore keyboard alternatives for frequent actions

**Applies To:** javafx 26

**Severity:** Low

**Good example:**

```text
saveButton.setMnemonicParsing(true); saveButton.setText("_Save");
```

**Bad example:**

```text
saveButton.setText("Save");
```
