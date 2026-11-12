---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-save-and-restore-app-state
title: "Save and restore app state"
summary: "Persist UI state across app restarts for continuity (ApplicationData APIs require packaged apps; unpackaged apps must use file IO or registry)"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Lifecycle guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L52"
status: active
revision: 1
---

# Save and restore app state

Persist UI state across app restarts for continuity (ApplicationData APIs require packaged apps; unpackaged apps must use file IO or registry)

**Do:** Save state to local settings on window close or navigation

**Don't:** Losing user context on every restart

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
ApplicationData.Current.LocalSettings.Values["lastPage"] = currentPage;
```

**Bad example:**

```text
No state persistence losing navigation position on restart
```
