---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-focusable-error-summary-post-submit-focus
title: "Focusable Error Summary (Post submit focus)"
summary: "Move focus to its heading or container after failed submit."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Forms / Accessibility guidance for Web interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L110"
status: active
revision: 1
---

# Focusable Error Summary (Post submit focus)

An error summary for failed validation complements inline field errors and must be easy to find by keyboard and screen reader users

**Do:** move focus to its heading or container after failed submit

**Don't:** Replace inline errors with a visual-only summary or move focus on every blur

**Platform:** Web

**Severity:** High

**Good example:**

```text
<div role="alert" tabindex="-1" aria-labelledby="error-title"><h2 id="error-title">There is a problem</h2><a href="#email">Enter an email address</a></div>
```

**Bad example:**

```text
Toast only with no field links or focus target
```
