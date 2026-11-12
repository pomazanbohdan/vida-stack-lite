---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxtjs-use-global-suffix-for-global-middleware-keep-global-middleware-idempotent
title: "Use .global suffix for global middleware (Keep global middleware idempotent)"
summary: "Keep global middleware idempotent because initial SSR middleware can run again during hydration — app/middleware/auth.global.ts."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Middleware guidance for nuxtjs 4.5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176; locator=stacks/nuxtjs.csv#L38"
status: active
revision: 1
---

# Use .global suffix for global middleware (Keep global middleware idempotent)

Keep global middleware idempotent because initial SSR middleware can run again during hydration

**Do:** Keep global middleware idempotent because initial SSR middleware can run again during hydration — app/middleware/auth.global.ts

**Don't:** Assume it runs exactly once

**Applies To:** nuxtjs 4.5

**Severity:** Medium

**Good example:**

```text
app/middleware/auth.global.ts
```

**Bad example:**

```text
Increment state unconditionally on every middleware run
```
