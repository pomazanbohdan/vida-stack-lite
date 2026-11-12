---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-partial-classes-for-platform-code
title: "Use partial classes for platform code"
summary: "Separate platform implementations in partial files"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Conditional guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L7"
status: active
revision: 1
---

# Use partial classes for platform code

Separate platform implementations in partial files

**Do:** Partial class files with platform-specific logic

**Don't:** #if directives in shared code for large blocks

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
MainPage.iOS.cs MainPage.Android.cs partial class files
```

**Bad example:**

```text
#if __IOS__ ... #elif __ANDROID__ ... 100-line blocks in shared file
```
