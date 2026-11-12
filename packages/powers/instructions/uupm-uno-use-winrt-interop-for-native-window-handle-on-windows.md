---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-winrt-interop-for-native-window-handle-on-windows
title: "Use WinRT.Interop for native window handle on Windows"
summary: "Calling Win32 APIs from a WinUI Window (file pickers icon embedding etc.) requires the HWND — retrieve it via WinRT.Interop.WindowNative.GetWindowHandle and guard the call so non-Windows targets stay unaffected"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L60"
status: active
revision: 1
---

# Use WinRT.Interop for native window handle on Windows

Calling Win32 APIs from a WinUI Window (file pickers icon embedding etc.) requires the HWND — retrieve it via WinRT.Interop.WindowNative.GetWindowHandle and guard the call so non-Windows targets stay unaffected

**Do:** GetWindowHandle inside a #if WINDOWS block when you need the HWND

**Don't:** Calling WinRT.Interop in shared code without a platform guard

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
#if WINDOWS\nvar hWnd = WinRT.Interop.WindowNative.GetWindowHandle(MainWindow);\n#endif
```

**Bad example:**

```text
var hWnd = WinRT.Interop.WindowNative.GetWindowHandle(MainWindow); // breaks build on iOS Android WASM
```
