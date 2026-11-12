---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-x-uid-for-localized-strings
title: "Use x:Uid for localized strings"
summary: "WinUI x:Uid resolves UI text from .resw resources at runtime — use it instead of hardcoded strings to support localization across iOS Android WASM and desktop from a single project"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L53"
status: active
revision: 1
---

# Use x:Uid for localized strings

WinUI x:Uid resolves UI text from .resw resources at runtime — use it instead of hardcoded strings to support localization across iOS Android WASM and desktop from a single project

**Do:** x:Uid on every user-facing string with matching .resw entries per language under Strings/{lang}/Resources.resw

**Don't:** Hardcoding language-specific strings into XAML or code-behind

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<Button x:Uid="SubmitButton"/> with Strings/en/Resources.resw entry SubmitButton.Content=Submit
```

**Bad example:**

```text
<Button Content="Submit"/> hardcoded in XAML
```
