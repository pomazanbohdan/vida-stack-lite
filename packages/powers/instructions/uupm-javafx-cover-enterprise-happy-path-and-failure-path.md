---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-cover-enterprise-happy-path-and-failure-path
title: "Cover enterprise happy path and failure path"
summary: "Enterprise UI tests should verify save validation permission and service failure flows"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L75"
status: active
revision: 1
---

# Cover enterprise happy path and failure path

Enterprise UI tests should verify save validation permission and service failure flows

**Do:** Use TestFX for core workflows and service fakes

**Don't:** Only test controller methods without UI interaction

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
clickOn("Save"); verifyThat("Customer saved", isVisible());
```

**Bad example:**

```text
controller.save(); assertTrue(saved);
```
