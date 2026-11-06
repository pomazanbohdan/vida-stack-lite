---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-marshal-cross-thread-work-to-the-ui-thread
title: "Marshal cross-thread work to the UI thread"
summary: "Avalonia controls and bound properties are not thread-safe and touching them off the UI thread throws InvalidOperationException"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Threading guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L50"
status: active
revision: 1
---

# Marshal cross-thread work to the UI thread

Avalonia controls and bound properties are not thread-safe and touching them off the UI thread throws InvalidOperationException

**Do:** Dispatcher.UIThread.Post or InvokeAsync to bounce work back to the UI thread

**Don't:** Direct property writes from Task.Run or background threads

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
await Dispatcher.UIThread.InvokeAsync(() => Status = "Done");
```

**Bad example:**

```text
Task.Run(() => { Status = "Done"; }); // throws Call from invalid thread
```
