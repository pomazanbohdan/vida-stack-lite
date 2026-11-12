---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-show-an-extended-splash-screen-on-wasm
title: "Show an extended splash screen on WASM"
summary: "WASM bundle download and runtime startup take several seconds on first load — render branded UI immediately so users do not see a blank page (AOT and trimming are covered separately)"
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: "WASM guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L36"
status: active
revision: 1
---

# Show an extended splash screen on WASM

WASM bundle download and runtime startup take several seconds on first load — render branded UI immediately so users do not see a blank page (AOT and trimming are covered separately)

**Do:** Render a splash overlay in wwwroot/index.html that hides on first XAML navigation

**Don't:** Letting the user wait on a blank white page while the runtime boots

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
index.html: <div id="uno-loading">Loading…</div> hidden via JS interop after first Frame.Navigate
```

**Bad example:**

```text
No splash markup in index.html — 5-second blank page on first visit
```
