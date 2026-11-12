---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-use-revalidatetag-max-for-swr-invalidation
title: "Use revalidateTag(..., \"max\") for SWR invalidation"
summary: "The one-argument revalidateTag form is deprecated; profile=\"max\" is the current stale-while-revalidate contract."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L60"
status: active
revision: 1
---

# Use revalidateTag(..., "max") for SWR invalidation

The one-argument revalidateTag form is deprecated; profile="max" is the current stale-while-revalidate contract.

**Do:** Use revalidateTag(tag, "max") for background refresh semantics

**Don't:** Rely on the deprecated single-argument revalidateTag(tag)

**Applies To:** nextjs 16.2

**Severity:** High

**Good example:**

```text
revalidateTag('posts', 'max')
```

**Bad example:**

```text
revalidateTag('posts')
```
