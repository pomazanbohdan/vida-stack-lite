---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-unified-net10-0-desktop-target
title: "Use unified net10.0-desktop target"
summary: "Uno 5.2+ ships a single Skia Desktop shell that auto-selects X11 Win32 or AppKit per OS — Skia.Gtk Skia.Linux.Framebuffer and Skia.WPF heads are deprecated"
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: "Renderers guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L15"
status: active
revision: 1
---

# Use unified net10.0-desktop target

Uno 5.2+ ships a single Skia Desktop shell that auto-selects X11 Win32 or AppKit per OS — Skia.Gtk Skia.Linux.Framebuffer and Skia.WPF heads are deprecated

**Do:** net10.0-desktop TFM with UnoPlatformHostBuilder for cross-platform desktop

**Don't:** Targeting the legacy Skia.Gtk or Skia.Linux.Framebuffer heads in new projects

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<TargetFrameworks>net10.0-desktop</TargetFrameworks> in the Uno.Sdk single project
```

**Bad example:**

```text
Per-OS Skia.Gtk Skia.MacOS Skia.Linux.Framebuffer head projects
```
