---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-contextual-live-badge-updates
title: "Contextual Live Badge Updates"
summary: "Async badge and count changes should announce a meaningful contextual status without moving focus"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L119"
status: active
revision: 1
---

# Contextual Live Badge Updates

Async badge and count changes should announce a meaningful contextual status without moving focus

**Do:** Use one appropriate atomic status message such as 3 items in cart

**Don't:** Announce a bare number or make every badge a competing live region

**Platform:** Web

**Severity:** High

**Good example:**

```text
<span role='status' aria-atomic='true'>3 items in cart</span>
```

**Bad example:**

```text
<span aria-live='polite'>3</span>
```
