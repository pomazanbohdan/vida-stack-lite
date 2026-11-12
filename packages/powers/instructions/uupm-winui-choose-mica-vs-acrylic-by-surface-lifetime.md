---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-choose-mica-vs-acrylic-by-surface-lifetime
title: "Choose Mica vs Acrylic by surface lifetime"
summary: "Mica is for long-lived primary surfaces like main windows; Acrylic is for transient light-dismiss surfaces like flyouts and context menus"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L53"
status: active
revision: 1
---

# Choose Mica vs Acrylic by surface lifetime

Mica is for long-lived primary surfaces like main windows; Acrylic is for transient light-dismiss surfaces like flyouts and context menus

**Do:** Mica on root window backgrounds and Acrylic on flyouts and overlays

**Don't:** Acrylic on the main window or Mica on transient flyouts

**Applies To:** winui current windows app sdk

**Severity:** Medium

**Good example:**

```text
<Window.SystemBackdrop><MicaBackdrop/></Window.SystemBackdrop> ... <FlyoutPresenter Background="{ThemeResource AcrylicInAppFillColorDefaultBrush}"/>
```

**Bad example:**

```text
Acrylic on every Window background causing battery and perf cost
```
