---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-chip-collection-reflow
title: "Chip Collection Reflow"
summary: "Filter chips and editable value collections must preserve labels when space or text size changes"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for All interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L116"
status: active
revision: 1
---

# Chip Collection Reflow

Filter chips and editable value collections must preserve labels when space or text size changes

**Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values

**Don't:** Force all chips into one clipped row or hide overflow values

**Platform:** All

**Severity:** High

**Good example:**

```text
<div class='chip-list'>{chips}</div> with flex-wrap
```

**Bad example:**

```text
<div class='chip-list' style='height:32px;overflow:hidden'>
```
