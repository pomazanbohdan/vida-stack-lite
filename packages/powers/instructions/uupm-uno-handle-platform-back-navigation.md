---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-handle-platform-back-navigation
title: "Handle platform back navigation"
summary: "SystemNavigationManager.BackRequested works on Android iOS and WASM but is unimplemented on WinAppSDK desktop where calling GetForCurrentView() throws at runtime"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L12"
status: active
revision: 1
---

# Handle platform back navigation

SystemNavigationManager.BackRequested works on Android iOS and WASM but is unimplemented on WinAppSDK desktop where calling GetForCurrentView() throws at runtime

**Do:** Subscribe to BackRequested only on platforms that support it or use Uno.Toolkit NavigationBar for cross-platform back UX

**Don't:** Calling SystemNavigationManager.GetForCurrentView() on WinUI 3 desktop without a guard

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
#if __ANDROID__ || __IOS__ || __WASM__ SystemNavigationManager.GetForCurrentView().BackRequested += OnBackRequested; #endif
```

**Bad example:**

```text
SystemNavigationManager.GetForCurrentView().BackRequested += OnBackRequested; with no platform guard — crashes on Windows desktop
```
