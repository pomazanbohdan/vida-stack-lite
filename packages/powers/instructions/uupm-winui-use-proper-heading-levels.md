---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-proper-heading-levels
title: "Use proper heading levels"
summary: "Screen readers use headings for navigation"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L35"
status: active
revision: 1
---

# Use proper heading levels

Screen readers use headings for navigation

**Do:** AutomationProperties.HeadingLevel on section headers

**Don't:** All text at same heading level

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<TextBlock AutomationProperties.HeadingLevel="Level1" Text="Settings"/>
```

**Bad example:**

```text
<TextBlock Style="{StaticResource TitleTextBlockStyle}"/> without heading level
```
