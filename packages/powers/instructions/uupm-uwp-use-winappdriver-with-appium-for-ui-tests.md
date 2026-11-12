---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-winappdriver-with-appium-for-ui-tests
title: "Use WinAppDriver with Appium for UI tests"
summary: "Automated UI testing for UWP (Coded UI Test was deprecated in Visual Studio 2019); WinAppDriver v1 is in low-maintenance mode and Appium 2 is the modern direction"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L52"
status: active
revision: 1
---

# Use WinAppDriver with Appium for UI tests

Automated UI testing for UWP (Coded UI Test was deprecated in Visual Studio 2019); WinAppDriver v1 is in low-maintenance mode and Appium 2 is the modern direction

**Do:** WinAppDriver with Appium for end-to-end tests

**Don't:** Manual regression testing

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
session.FindElementByAccessibilityId("SaveButton").Click();
```

**Bad example:**

```text
Manual click-through testing before each release
```
