---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-treat-middleware-ts-and-export-function-middleware-as-legacy
title: "Treat middleware.ts and export function middleware as legacy"
summary: "The middleware filename and named export are deprecated in Next.js 16; use proxy.ts and export function proxy instead."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Middleware guidance for nextjs legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L62"
status: active
revision: 1
---

# Treat middleware.ts and export function middleware as legacy

The middleware filename and named export are deprecated in Next.js 16; use proxy.ts and export function proxy instead.

**Do:** Rename middleware.ts to proxy.ts during migration

**Don't:** Introduce new middleware.ts code

**Applies To:** nextjs legacy

**Severity:** High

**Good example:**

```text
proxy.ts
```

**Bad example:**

```text
middleware.ts
```
