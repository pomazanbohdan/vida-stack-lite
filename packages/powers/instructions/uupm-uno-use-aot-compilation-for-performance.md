---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uno-use-aot-compilation-for-performance
title: "Use AOT compilation for performance"
summary: "Ahead-of-time compilation improves runtime speed"
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: "WASM guidance for uno current Uno.Sdk/Uno.WinUI."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uno.csv; sha256=a0474363e4225b5367214d5675fd3e075f137026f9500f0d04357882ef4f6d48; locator=stacks/uno.csv#L37"
status: active
revision: 1
---

# Use AOT compilation for performance

Ahead-of-time compilation improves runtime speed

**Do:** AOT for production WASM builds

**Don't:** Interpreter mode in production

**Applies To:** uno current Uno.Sdk/Uno.WinUI

**Severity:** Medium

**Good example:**

```text
<WasmShellMonoRuntimeExecutionMode>InterpreterAndAOT</WasmShellMonoRuntimeExecutionMode>
```

**Bad example:**

```text
Default interpreter mode in production deployment
```
