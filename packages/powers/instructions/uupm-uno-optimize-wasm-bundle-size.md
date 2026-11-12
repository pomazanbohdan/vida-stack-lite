---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-optimize-wasm-bundle-size
title: "Optimize WASM bundle size"
summary: "WebAssembly downloads can be large"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L18"
status: active
revision: 1
---

# Optimize WASM bundle size

WebAssembly downloads can be large

**Do:** IL linker and AOT for smaller WASM bundles

**Don't:** Default settings for production WASM

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** High

**Good example:**

```text
<WasmShellILLinkerEnabled>true</WasmShellILLinkerEnabled>
```

**Bad example:**

```text
Publishing WASM without linker
```
