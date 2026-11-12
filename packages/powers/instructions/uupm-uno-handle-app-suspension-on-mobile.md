---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-handle-app-suspension-on-mobile
title: "Handle app suspension on mobile"
summary: "iOS and Android may suspend or terminate the app — WinAppSDK desktop does not raise Suspending so use window Closed for desktop save-state"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Lifecycle guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L45"
status: active
revision: 1
---

# Handle app suspension on mobile

iOS and Android may suspend or terminate the app — WinAppSDK desktop does not raise Suspending so use window Closed for desktop save-state

**Do:** Save state in OnSuspending and restore on activation

**Don't:** Ignoring lifecycle losing user state on mobile

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
Application.Current.Suspending += (s, e) => { var d = e.SuspendingOperation.GetDeferral(); SaveState(); d.Complete(); };
```

**Bad example:**

```text
No suspend handler losing form data on mobile
```
