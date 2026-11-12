---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-never-block-on-async-with-result-or-wait-configureawait-false-in-libraries
title: "Never block on async with .Result or .Wait() (Configureawait false in libraries)"
summary: "In libraries call ConfigureAwait(false) to avoid context capture."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Performance guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L56"
status: active
revision: 1
---

# Never block on async with .Result or .Wait() (Configureawait false in libraries)

Blocking on a Task from the UI thread deadlocks because the awaiter cannot resume on the captured SynchronizationContext

**Do:** In libraries call ConfigureAwait(false) to avoid context capture

**Don't:** Calling .Result .Wait() or GetAwaiter().GetResult() on a Task from the UI thread

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Bad example:**

```text
private void OnLoadClick(object s, RoutedEventArgs e) { var data = _api.GetAsync().Result; } // deadlocks on UI thread
```
