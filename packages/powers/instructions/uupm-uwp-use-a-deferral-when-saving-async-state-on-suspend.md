---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-a-deferral-when-saving-async-state-on-suspend
title: "Use a deferral when saving async state on suspend"
summary: "Suspending grants only ~5 seconds before the OS may terminate; await work needs SuspendingOperation.GetDeferral and Complete or save returns before it finishes"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Lifecycle guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L56"
status: active
revision: 1
---

# Use a deferral when saving async state on suspend

Suspending grants only ~5 seconds before the OS may terminate; await work needs SuspendingOperation.GetDeferral and Complete or save returns before it finishes

**Do:** GetDeferral around async save calls and Complete in finally

**Don't:** Async work that returns the suspending handler before completion

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
async void OnSuspending(object s, SuspendingEventArgs e) { var d = e.SuspendingOperation.GetDeferral(); try { await SaveAsync(); } finally { d.Complete(); } }
```

**Bad example:**

```text
async void OnSuspending(object s, SuspendingEventArgs e) { await SaveAsync(); } // handler returns before save completes
```
