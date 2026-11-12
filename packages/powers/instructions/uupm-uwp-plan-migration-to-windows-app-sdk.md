---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-plan-migration-to-windows-app-sdk
title: "Plan migration to Windows App SDK"
summary: "Maintain existing UWP apps while planning migration to WinUI 3 and the Windows App SDK; do not expand UWP as the foundation for new Windows development"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L55"
status: active
revision: 1
---

# Plan migration to Windows App SDK

Maintain existing UWP apps while planning migration to WinUI 3 and the Windows App SDK; do not expand UWP as the foundation for new Windows development

**Do:** Use the UWP migration guidance to plan an incremental migration or full port to WinUI 3

**Don't:** Continue major new-app investment on UWP without a Windows App SDK migration plan

**Applies To:** uwp legacy

**Severity:** Medium

**Good example:**

```text
Follow the UWP to WinUI 3 migration guide for existing apps
```

**Bad example:**

```text
Start a new Windows app on UWP instead of WinUI 3
```
