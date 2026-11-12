---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-handle-suspend-and-resume
title: "Handle suspend and resume"
summary: "UWP apps are suspended when not in foreground"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L48"
status: active
revision: 1
---

# Handle suspend and resume

UWP apps are suspended when not in foreground

**Do:** Save state in OnSuspending and restore in OnLaunched

**Don't:** Ignoring app lifecycle losing user state

**Applies To:** uwp legacy

**Severity:** High

**Good example:**

```text
Application.Current.Suspending += (s, e) => SaveState();
```

**Bad example:**

```text
No suspend handler losing in-progress form data
```
