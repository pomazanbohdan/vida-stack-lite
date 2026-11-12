---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-test-rendering-on-each-target
title: "Test rendering on each target"
summary: "Visual differences exist between renderers"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L16"
status: active
revision: 1
---

# Test rendering on each target

Visual differences exist between renderers

**Do:** Visual testing on each active target platform

**Don't:** Testing only on Windows assuming others match

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
Screenshot tests on iOS Android WASM and Desktop
```

**Bad example:**

```text
Testing only on Windows Desktop
```
