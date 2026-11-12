---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-handle-back-button-correctly-in-app-back-button
title: "Handle back button correctly (In app back button)"
summary: "Provide an in-app NavigationBackButtonNormalStyle back button."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Navigation guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L19"
status: active
revision: 1
---

# Handle back button correctly (In app back button)

Provide an in-app Back button styled with NavigationBackButtonNormalStyle

**Do:** Provide an in-app NavigationBackButtonNormalStyle back button

**Don't:** Relying on the deprecated title-bar back button (AppViewBackButtonVisibility)

**Applies To:** uwp legacy

**Severity:** High

**Bad example:**

```text
No back button support on phone or tablet
```
