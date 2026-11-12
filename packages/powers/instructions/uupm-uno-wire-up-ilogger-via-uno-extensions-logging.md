---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-wire-up-ilogger-via-uno-extensions-logging
title: "Wire up ILogger via Uno.Extensions.Logging"
summary: "Cross-platform logging routes to platform-native sinks (OSLog on iOS Console on WASM Debug elsewhere) when configured through the IHost builder"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L54"
status: active
revision: 1
---

# Wire up ILogger via Uno.Extensions.Logging

Cross-platform logging routes to platform-native sinks (OSLog on iOS Console on WASM Debug elsewhere) when configured through the IHost builder

**Do:** Inject ILogger<T> into ViewModels and services and call UseLogging() on the host builder

**Don't:** Console.WriteLine or platform-specific log APIs scattered across shared code

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
Host.CreateDefaultBuilder().UseLogging(c => c.SetMinimumLevel(LogLevel.Information)) and ILogger<MainViewModel> via constructor injection
```

**Bad example:**

```text
Console.WriteLine("error") in shared code with no platform-aware routing
```
