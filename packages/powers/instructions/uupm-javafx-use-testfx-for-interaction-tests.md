---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-testfx-for-interaction-tests
title: "Use TestFX for interaction tests"
summary: "UI flows need automated coverage beyond controller unit tests"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L46"
status: active
revision: 1
---

# Use TestFX for interaction tests

UI flows need automated coverage beyond controller unit tests

**Do:** Write TestFX tests for key forms dialogs and navigation

**Don't:** Only manually click through releases

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
clickOn("#nameField").write("Alice"); clickOn("Save"); verifyThat("Saved", isVisible());
```

**Bad example:**

```text
// manual QA only
```
