---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-persist-desktop-window-state-via-window-closed
title: "Persist desktop window state via Window.Closed"
summary: "WinAppSDK and Skia desktop heads do not raise Application.Suspending — handle the Window.Closed event (and AppWindow size/position changes) to save user state when desktop apps shut down"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L59"
status: active
revision: 1
---

# Persist desktop window state via Window.Closed

WinAppSDK and Skia desktop heads do not raise Application.Suspending — handle the Window.Closed event (and AppWindow size/position changes) to save user state when desktop apps shut down

**Do:** Subscribe to MainWindow.Closed and persist any unsaved state before the window is destroyed

**Don't:** Relying on Application.Suspending to fire on desktop targets

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
m_window.Closed += (s, e) => SaveState();
```

**Bad example:**

```text
Application.Current.Suspending += SaveState; // never fires on WinAppSDK or Skia desktop
```
