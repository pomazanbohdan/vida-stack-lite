---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-support-multi-window-with-secondary-views
title: "Support multi-window with secondary views"
summary: "Open detached views with CoreApplication.CreateNewView and ApplicationViewSwitcher"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Adaptive guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L39"
status: active
revision: 1
---

# Support multi-window with secondary views

Open detached views with CoreApplication.CreateNewView and ApplicationViewSwitcher

**Do:** CreateNewView and TryShowAsStandaloneAsync for multi-document scenarios

**Don't:** Single-window assumptions when scenarios benefit from secondary views

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
var view = CoreApplication.CreateNewView(); await view.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, () => { /* set content */ });
```

**Bad example:**

```text
Modal overlay used for content that should be a separate window
```
