---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-focus-states
title: "Focus States"
summary: "Keyboard focus, including controls inside a modal, needs a visible indicator"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Interaction guidance for All interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L29"
status: active
revision: 1
---

# Focus States

Keyboard focus, including controls inside a modal, needs a visible indicator

**Do:** Use a visible focus ring on every interactive control, including modal controls

**Don't:** Remove focus outline without replacement

**Platform:** All

**Severity:** High

**Good example:**

```text
focus:ring-2 focus:ring-blue-500
```

**Bad example:**

```text
outline-none without alternative
```
