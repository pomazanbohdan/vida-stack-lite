---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-override-app-onstartup-for-app-initialization
title: "Override App.OnStartup for app initialization"
summary: "Wire DI build the host resolve MainWindow and parse command-line args in OnStartup"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L50"
status: active
revision: 1
---

# Override App.OnStartup for app initialization

Wire DI build the host resolve MainWindow and parse command-line args in OnStartup

**Do:** Override OnStartup when DI or argument parsing is needed

**Don't:** Relying on StartupUri when MainWindow needs constructor injection

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
protected override void OnStartup(StartupEventArgs e) { _host.Start(); _host.Services.GetRequiredService<MainWindow>().Show(); }
```

**Bad example:**

```text
<Application StartupUri="MainWindow.xaml"/> when MainWindow has constructor dependencies
```
