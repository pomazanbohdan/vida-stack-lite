---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-support-light-and-dark-themes-872048c5"
title: "Support light and dark themes"
summary: "Support light and dark themes; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "design-system-adherence"
conditions_applies_when: "Applies when the selected framework variant matches."
conditions_does_not_apply_when: "The framework is not one of the declared variants or the variant exception applies."
artifact_contract_output_type: "none"
artifact_contract_required_data: []
artifact_contract_verified_by: "Each selected variant retains its source-specific contract and is checked against its source-bound guidance."
compatibility_excludes: []
compatibility_requires: []
roles: []
products: []
provenance: 
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Support light and dark themes\",\"summary\":\"Application.RequestedTheme accepts only ApplicationTheme.Light/Dark — to follow the system theme leave it unset entirely. ElementTheme.Default exists only on FrameworkElement.RequestedTheme not on Application\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for uno current Uno.Sdk/Uno.WinUI.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-uno-support-light-and-dark-themes\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/uno.csv\",\"rowKey\":\"path=stacks/uno.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=58ff459186887d79ec96348dbc7a2f000272d55a67a58c4252fc71d3626b944f\",\"rawSha256\":\"a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48\"},\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\",\"applicability\":{\"frameworks\":[{\"name\":\"uno\",\"sourceLabel\":\"uno current Uno.Sdk/Uno.WinUI\"}],\"requiredContext\":[\"framework:uno\"]},\"contentSha256\":\"a90f77d46b8facdf57487a84701d6e8e31f3a77a9a580aeb50ce54c631e71de1\"},{\"title\":\"Support light and dark themes\",\"summary\":\"Respect user and system theme preference\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for winui current windows app sdk.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-winui-support-light-and-dark-themes\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/winui.csv\",\"rowKey\":\"path=stacks/winui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=36e5b1b11946e008cc1fe06977d55adeb08a8de607d59120a54f089c7c37a737\",\"rawSha256\":\"e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85\"},\"sourceLabel\":\"winui current windows app sdk\",\"applicability\":{\"frameworks\":[{\"name\":\"winui\",\"sourceLabel\":\"winui current windows app sdk\"}],\"requiredContext\":[\"framework:winui\"]},\"contentSha256\":\"de7d62bde9b46483fa34343ad1eb7f5d7cc40cea640e68683cd425821434e8b9\"}]"
---
<!-- sbvf:variant:begin uupm-uno-support-light-and-dark-themes -->
# Support light and dark themes

Application.RequestedTheme accepts only ApplicationTheme.Light/Dark — to follow the system theme leave it unset entirely. ElementTheme.Default exists only on FrameworkElement.RequestedTheme not on Application

**Do:** Omit Application.RequestedTheme so the OS theme wins; set Light or Dark explicitly only after a user chooses an override

**Don't:** Setting Application.RequestedTheme="Default" — not a valid ApplicationTheme value and throws at parse time

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<Application></Application> with RequestedTheme unset
```

**Bad example:**

```text
<Application RequestedTheme="Default"> // not a valid ApplicationTheme
```
<!-- sbvf:variant:end uupm-uno-support-light-and-dark-themes -->
<!-- sbvf:variant:begin uupm-winui-support-light-and-dark-themes -->
# Support light and dark themes

Respect user and system theme preference

**Do:** ThemeResource for theme-adaptive values

**Don't:** Hardcoded colors that break in dark mode

**Applies To:** winui current windows app sdk

**Severity:** High

**Good example:**

```text
Foreground="{ThemeResource TextFillColorPrimaryBrush}"
```

**Bad example:**

```text
Foreground="Black"
```
<!-- sbvf:variant:end uupm-winui-support-light-and-dark-themes -->
