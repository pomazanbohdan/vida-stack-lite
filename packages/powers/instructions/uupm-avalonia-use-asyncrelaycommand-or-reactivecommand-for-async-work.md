---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-asyncrelaycommand-or-reactivecommand-for-async-work
title: "Use AsyncRelayCommand or ReactiveCommand for async work"
summary: "Async-aware commands disable themselves while running and surface CancellationToken so users cannot double-invoke a long operation"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Commands guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L51"
status: active
revision: 1
---

# Use AsyncRelayCommand or ReactiveCommand for async work

Async-aware commands disable themselves while running and surface CancellationToken so users cannot double-invoke a long operation

**Do:** [RelayCommand] async Task method or ReactiveCommand.CreateFromTask

**Don't:** async void event handlers or fire-and-forget Task.Run from a click handler

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
[RelayCommand] private async Task LoadAsync(CancellationToken ct) { await _api.GetAsync(ct); }
```

**Bad example:**

```text
private async void OnClick(object s, RoutedEventArgs e) { await LongOperation(); }
```
