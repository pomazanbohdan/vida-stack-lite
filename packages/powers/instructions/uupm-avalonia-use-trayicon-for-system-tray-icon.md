---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-trayicon-for-system-tray-icon
title: "Use TrayIcon for system tray icon"
summary: "TrayIcon shows a native system tray/notification-area icon with a NativeMenu - declare it via the Application.TrayIcon.Icons attached property in App.axaml; works on Windows macOS and most Linux desktops"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Windowing guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L56"
status: active
revision: 1
---

# Use TrayIcon for system tray icon

TrayIcon shows a native system tray/notification-area icon with a NativeMenu - declare it via the Application.TrayIcon.Icons attached property in App.axaml; works on Windows macOS and most Linux desktops

**Do:** TrayIcon with NativeMenu inside TrayIcon.Icons on the Application

**Don't:** Custom borderless window pretending to be a tray icon or per-platform native interop

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
<TrayIcon.Icons><TrayIcons><TrayIcon Icon="/Assets/tray.ico" ToolTipText="MyApp"><TrayIcon.Menu><NativeMenu><NativeMenuItem Header="Show" Command="{Binding ShowCommand}"/></NativeMenu></TrayIcon.Menu></TrayIcon></TrayIcons></TrayIcon.Icons>
```

**Bad example:**

```text
Hidden Window with custom shell-notification-area P/Invoke
```
