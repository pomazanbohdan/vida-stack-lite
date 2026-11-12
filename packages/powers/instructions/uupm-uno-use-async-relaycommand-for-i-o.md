---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-async-relaycommand-for-i-o
title: "Use async [RelayCommand] for I/O"
summary: "AsyncRelayCommand reports CanExecute=false (raising CanExecuteChanged) and exposes IsRunning while the Task is in flight — the bound control is disabled and re-entrancy is prevented by default (AllowConcurrentExecutions=false)"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L52"
status: active
revision: 1
---

# Use async [RelayCommand] for I/O

AsyncRelayCommand reports CanExecute=false (raising CanExecuteChanged) and exposes IsRunning while the Task is in flight — the bound control is disabled and re-entrancy is prevented by default (AllowConcurrentExecutions=false)

**Do:** [RelayCommand] on a Task-returning method for awaitable work

**Don't:** async void event handlers calling .Wait() or .Result

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
[RelayCommand] private async Task LoadAsync() { Items = await _api.GetAsync(); }
```

**Bad example:**

```text
public void OnLoadClick(object s, EventArgs e) { LoadAsync().Wait(); } deadlock risk
```
