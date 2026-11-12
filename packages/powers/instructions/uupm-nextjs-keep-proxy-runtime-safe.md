---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-keep-proxy-runtime-safe
title: "Keep proxy runtime-safe"
summary: "Proxy runs in nodejs runtime and fetch cache options do not apply there."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Middleware guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L35"
status: active
revision: 1
---

# Keep proxy runtime-safe

Proxy runs in nodejs runtime and fetch cache options do not apply there.

**Do:** Keep proxy logic lightweight and nodejs-compatible

**Don't:** Use Node-incompatible code or rely on fetch cache options in proxy

**Applies To:** nextjs 16.2

**Severity:** High

**Good example:**

```text
Edge-compatible auth check
```

**Bad example:**

```text
fs.readFile in middleware
```
