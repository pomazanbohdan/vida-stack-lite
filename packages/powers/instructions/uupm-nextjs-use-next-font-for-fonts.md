---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-use-next-font-for-fonts
title: "Use next/font for fonts"
summary: "Self-hosted fonts with zero layout shift"
capability_tags:
  - set-web-type
pattern_tags:
  - type-context
conditions_applies_when: "Fonts guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L23"
status: active
revision: 1
---

# Use next/font for fonts

Self-hosted fonts with zero layout shift

**Do:** next/font/google or next/font/local

**Don't:** External font links

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
import { Inter } from 'next/font/google'
```

**Bad example:**

```text
<link href="fonts.googleapis.com"/>
```
