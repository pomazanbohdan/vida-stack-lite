---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxtjs-use-ssr-by-default
title: "Use SSR by default"
summary: "Server-side rendering is enabled by default"
capability_tags:
  - optimize-web-performance
pattern_tags:
  - critical-render-path
conditions_applies_when: "Rendering guidance for nuxtjs 4.5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176; locator=stacks/nuxtjs.csv#L7"
status: active
revision: 1
---

# Use SSR by default

Server-side rendering is enabled by default

**Do:** Keep ssr: true (default)

**Don't:** Disable SSR unnecessarily

**Applies To:** nuxtjs 4.5

**Severity:** High

**Good example:**

```text
ssr: true (default)
```

**Bad example:**

```text
ssr: false for all pages
```
