---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-prefer-winui-3-for-new-projects
title: "Prefer WinUI 3 for new projects"
summary: "UWP is maintenance-only; WinUI 3 with the Windows App SDK is the recommended path for new Windows apps"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L54"
status: active
revision: 1
---

# Prefer WinUI 3 for new projects

UWP is maintenance-only; WinUI 3 with the Windows App SDK is the recommended path for new Windows apps

**Do:** Use WinUI 3 with the Windows App SDK for every new Windows app

**Don't:** Start a new Windows app on UWP

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
New project with Microsoft.WindowsAppSDK and WinUI 3
```

**Bad example:**

```text
New UWP project for a Windows app
```
