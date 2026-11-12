---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-configure-caching-explicitly-next-js-16-2
title: "Configure caching explicitly (Next.js 16.2+)"
summary: "Next.js 16 uses Cache Components and explicit cache directives instead of assuming fetch is the cache model."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - critical-render-path
conditions_applies_when: "DataFetching guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L14"
status: active
revision: 1
---

# Configure caching explicitly (Next.js 16.2+)

Next.js 16 uses Cache Components and explicit cache directives instead of assuming fetch is the cache model.

**Do:** Set cache semantics explicitly for static and dynamic data

**Don't:** Assume fetch defaults alone define the cache model

**Applies To:** nextjs 16.2

**Severity:** High

**Good example:**

```text
fetch(url, { cache: 'force-cache' })
```

**Bad example:**

```text
fetch(url) // Uncached in v15
```
