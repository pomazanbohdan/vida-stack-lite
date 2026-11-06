---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-initialize-mainwindow-in-onframeworkinitializationcompleted
title: "Initialize MainWindow in OnFrameworkInitializationCompleted"
summary: "Override OnFrameworkInitializationCompleted on App and check ApplicationLifetime - on desktop cast to IClassicDesktopStyleApplicationLifetime to set MainWindow and ShutdownMode; never create windows in the App constructor before the framework is ready"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Lifecycle guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L46"
status: active
revision: 1
---

# Initialize MainWindow in OnFrameworkInitializationCompleted

Override OnFrameworkInitializationCompleted on App and check ApplicationLifetime - on desktop cast to IClassicDesktopStyleApplicationLifetime to set MainWindow and ShutdownMode; never create windows in the App constructor before the framework is ready

**Do:** Override OnFrameworkInitializationCompleted and pattern-match on IClassicDesktopStyleApplicationLifetime for desktop-only setup

**Don't:** Creating windows in the App constructor or assuming the same lifetime type on every platform

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
public override void OnFrameworkInitializationCompleted() { if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop) { desktop.MainWindow = new MainWindow(); desktop.ShutdownMode = ShutdownMode.OnMainWindowClose; } base.OnFrameworkInitializationCompleted(); }
```

**Bad example:**

```text
public App() { new MainWindow().Show(); } // window created before framework init and ignores lifetime type
```
