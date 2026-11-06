---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-font-loading-2
title: "Font Loading"
summary: "Fonts should load without layout shift"
capability_tags:
  - set-web-type
pattern_tags:
  - type-context
conditions_applies_when: "Typography guidance for Web interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L76"
status: active
revision: 1
---

# Font Loading

Fonts should load without layout shift

**Do:** Reserve space with fallback font

**Don't:** Layout shift when fonts load

**Platform:** Web

**Severity:** Medium

**Good example:**

```text
font-display: swap + similar fallback
```

**Bad example:**

```text
No fallback font
```
