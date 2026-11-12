---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-ui-automation-for-integration-tests
title: "Use UI Automation for integration tests"
summary: "Automated UI testing with Microsoft UI Automation"
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Testing guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L57"
status: active
revision: 1
---

# Use UI Automation for integration tests

Automated UI testing with Microsoft UI Automation

**Do:** FlaUI or Appium 2 (appium-windows-driver) for end-to-end tests

**Don't:** Manual regression testing only

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
AutomationElement.FindFirst(TreeScope.Children, condition)
```

**Bad example:**

```text
Manual click-through testing
```
