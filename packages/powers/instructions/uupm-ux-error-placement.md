---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-error-placement
title: "Error Placement"
summary: "Each invalid field needs an inline error connected to that field"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for All interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L56"
status: active
revision: 1
---

# Error Placement

Each invalid field needs an inline error connected to that field

**Do:** Show a specific error below the input and reference it with aria-describedby

**Don't:** Show only a top-level error without identifying each invalid field

**Platform:** All

**Severity:** High

**Good example:**

```text
<input aria-describedby="email-error"><p id="email-error">Enter an email address</p>
```

**Bad example:**

```text
Red border or summary only
```
