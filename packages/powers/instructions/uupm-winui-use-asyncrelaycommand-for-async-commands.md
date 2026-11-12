---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-asyncrelaycommand-for-async-commands
title: "Use AsyncRelayCommand for async commands"
summary: "AsyncRelayCommand exposes IsRunning and supports cancellation for IO bound work"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L59"
status: active
revision: 1
---

# Use AsyncRelayCommand for async commands

AsyncRelayCommand exposes IsRunning and supports cancellation for IO bound work

**Do:** [RelayCommand] on async Task method or AsyncRelayCommand for IO work

**Don't:** async void event handlers or fire-and-forget Task.Run from button click

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
[RelayCommand] private async Task LoadAsync(CancellationToken ct) { Items = await _service.FetchAsync(ct); }
```

**Bad example:**

```text
private async void Button_Click(object s, RoutedEventArgs e) { await LoadAsync(); }
```
