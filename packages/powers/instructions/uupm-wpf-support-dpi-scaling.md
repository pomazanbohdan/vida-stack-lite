---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-support-dpi-scaling
title: "Support DPI scaling"
summary: "Ensure UI is crisp at all display scale factors"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L47"
status: active
revision: 1
---

# Support DPI scaling

Ensure UI is crisp at all display scale factors

**Do:** Device-independent units and vector graphics

**Don't:** Pixel-based bitmaps that blur at high DPI

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
<Path Data="M 10,10 L 20,20"/> or DrawingImage
```

**Bad example:**

```text
<Image Source="icon_32x32.png"/> at 200% scaling
```
