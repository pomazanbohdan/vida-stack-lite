---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-focus-not-obscured-enhanced
title: "Focus Not Obscured (Enhanced)"
summary: "WCAG 2.2 AAA requires keyboard focus to remain fully visible"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for Web interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L102"
status: active
revision: 1
---

# Focus Not Obscured (Enhanced)

WCAG 2.2 AAA requires keyboard focus to remain fully visible

**Do:** Keep the entire focused component unobscured by author-created content

**Don't:** Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus

**Platform:** Web

**Severity:** Medium

**Good example:**

```text
close persistent overlay before focus moves behind it
```

**Bad example:**

```text
sticky footer covers half the focused button
```
