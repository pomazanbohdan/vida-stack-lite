---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-report-progress-from-background-tasks
title: "Report progress from background tasks"
summary: "Update UI with progress during long operations"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L41"
status: active
revision: 1
---

# Report progress from background tasks

Update UI with progress during long operations

**Do:** IProgress<T> with Task.Run

**Don't:** Polling a shared variable for progress

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
var progress = new Progress<int>(p => ProgressBar.Value = p); await Task.Run(() => Work(progress));
```

**Bad example:**

```text
while (!done) { Thread.Sleep(100); check shared int; }
```
