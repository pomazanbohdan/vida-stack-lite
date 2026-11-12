---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-use-server-components-by-default
title: "Use Server Components by default"
summary: "Server Components reduce client JS bundle"
capability_tags:
  - optimize-web-performance
pattern_tags:
  - critical-render-path
conditions_applies_when: "Rendering guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L8"
status: active
revision: 1
---

# Use Server Components by default

Server Components reduce client JS bundle

**Do:** Keep components server by default

**Don't:** Add 'use client' unnecessarily

**Applies To:** nextjs 16.2

**Severity:** High

**Good example:**

```text
export default function Page()
```

**Bad example:**

```text
('use client') for static content
```
