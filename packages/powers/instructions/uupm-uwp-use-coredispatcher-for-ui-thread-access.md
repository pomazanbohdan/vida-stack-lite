---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-coredispatcher-for-ui-thread-access
title: "Use CoreDispatcher for UI thread access"
summary: "Post work back to the UI thread from background"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Threading guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L33"
status: active
revision: 1
---

# Use CoreDispatcher for UI thread access

Post work back to the UI thread from background

**Do:** Dispatcher.RunAsync from background threads

**Don't:** Touching UI elements from background threads

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
await Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () => Status = "Done");
```

**Bad example:**

```text
textBlock.Text = "Done" from Task.Run
```
