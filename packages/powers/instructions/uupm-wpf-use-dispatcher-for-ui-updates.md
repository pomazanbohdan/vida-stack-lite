---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-dispatcher-for-ui-updates
title: "Use Dispatcher for UI updates"
summary: "UI elements can only be accessed from the UI thread"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Threading guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L38"
status: active
revision: 1
---

# Use Dispatcher for UI updates

UI elements can only be accessed from the UI thread

**Do:** Dispatcher.Invoke or BeginInvoke from background threads

**Don't:** Accessing UI elements from background threads

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
Application.Current.Dispatcher.Invoke(() => Status = "Done");
```

**Bad example:**

```text
textBlock.Text = "Done" from Task.Run
```
