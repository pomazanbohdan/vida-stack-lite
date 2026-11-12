---
schema: VPInstruction/v2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-touch-target-size-ios
title: "Touch Target Size (iOS)"
summary: "Touch target guidance depends on platform and web context"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Touch guidance for iOS interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
applicability: "{\"platforms\":[{\"value\":\"ios\",\"sourceLabel\":\"iOS\"}]}"
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L23"
status: active
revision: 1
---

# Touch Target Size (iOS)

Touch target guidance depends on platform and web context

**Do:** Use 44pt on iOS

**Don't:** Treat one unit or minimum as universal across platforms

**Platform:** iOS

**Severity:** High

**Good example:**

```text
iOS 44pt
```

**Bad example:**

```text
w-6 h-6 buttons
```
