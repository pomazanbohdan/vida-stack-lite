---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-target-size-minimum
title: "Target Size (Minimum)"
summary: "WCAG 2.2 AA requires 24 CSS px pointer targets or an applicable exception"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L105"
status: active
revision: 1
---

# Target Size (Minimum)

WCAG 2.2 AA requires 24 CSS px pointer targets or an applicable exception

**Do:** Use at least 24 by 24 CSS px or verify spacing equivalent inline user-agent or essential exceptions

**Don't:** Assume native 44pt or 48dp guidance defines web conformance

**Platform:** Web

**Severity:** High

**Good example:**

```text
min-width: 24px; min-height: 24px
```

**Bad example:**

```text
tiny adjacent icon buttons
```
