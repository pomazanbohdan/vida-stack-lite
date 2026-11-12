---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-uno-extensions-hosting-for-startup
title: "Use Uno.Extensions.Hosting for startup"
summary: "Structured app initialization with DI and configuration"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L46"
status: active
revision: 1
---

# Use Uno.Extensions.Hosting for startup

Structured app initialization with DI and configuration

**Do:** IHost builder pattern for app startup and service registration

**Don't:** Manual initialization in App constructor

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
Host.CreateDefaultBuilder().ConfigureServices(s => s.AddSingleton<MainViewModel>()).Build();
```

**Bad example:**

```text
new MainViewModel() in App.xaml.cs constructor
```
