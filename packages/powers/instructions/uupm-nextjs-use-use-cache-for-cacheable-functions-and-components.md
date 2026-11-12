---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-use-use-cache-for-cacheable-functions-and-components
title: "Use use cache for cacheable functions and components"
summary: "The use cache directive marks a route, component, or function as cacheable under Cache Components."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L55"
status: active
revision: 1
---

# Use use cache for cacheable functions and components

The use cache directive marks a route, component, or function as cacheable under Cache Components.

**Do:** Place use cache at file, component, or function scope where the result is cacheable

**Don't:** Cache runtime-sensitive data without passing it in as arguments

**Applies To:** nextjs 16.2

**Severity:** High

**Good example:**

```text
'use cache'
export default async function Page() { }
```

**Bad example:**

```text
export default async function Page() { /* uncached by accident */ }
```
