---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-text-reflow-and-spacing
title: "Text Reflow and Spacing"
summary: "Text must remain available at narrow widths zoom and user spacing overrides"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L113"
status: active
revision: 1
---

# Text Reflow and Spacing

Text must remain available at narrow widths zoom and user spacing overrides

**Do:** Use fluid sizes content-driven height and unitless line height

**Don't:** Clip text in fixed-width or fixed-height boxes

**Platform:** Web

**Severity:** Critical

**Good example:**

```text
.copy { inline-size: min(100%, 65ch); height: auto; line-height: 1.5; }
```

**Bad example:**

```text
.copy { width: 900px; height: 40px; overflow: hidden; }
```
