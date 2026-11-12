---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-set-cache-lifetime-with-cachelife
title: "Set cache lifetime with cacheLife"
summary: "Use cacheLife with use cache to make cache freshness explicit and readable."
capability_tags:
  - improve-performance
pattern_tags:
  - cache-design
conditions_applies_when: "Caching guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L57"
status: active
revision: 1
---

# Set cache lifetime with cacheLife

Use cacheLife with use cache to make cache freshness explicit and readable.

**Do:** Choose a cacheLife profile that matches update frequency

**Don't:** Leave cache behavior implicit when the data has a known freshness window

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
cacheLife('days')
```

**Bad example:**

```text
/* implicit default */
```
