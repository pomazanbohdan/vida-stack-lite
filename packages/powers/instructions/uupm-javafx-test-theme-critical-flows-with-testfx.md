---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-test-theme-critical-flows-with-testfx
title: "Test theme-critical flows with TestFX"
summary: "Theme and CSS changes can break focus visibility dialogs and button affordance"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L58"
status: active
revision: 1
---

# Test theme-critical flows with TestFX

Theme and CSS changes can break focus visibility dialogs and button affordance

**Do:** Use TestFX for login save validation and modal workflows

**Don't:** Only inspect AtlantaFX screens manually

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
clickOn("#saveButton"); verifyThat(".message", isVisible());
```

**Bad example:**

```text
manual theme QA only
```
