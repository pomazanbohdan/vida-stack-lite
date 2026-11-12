---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxtjs-declare-keys-before-nuxt-overrides
title: "Declare keys before NUXT_ overrides"
summary: "Declare every runtimeConfig key in nuxt.config before overriding it with a matching NUXT_ environment variable"
capability_tags:
  - harden-security-controls
pattern_tags: []
conditions_applies_when: "Environment guidance for nuxtjs 4.5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176; locator=stacks/nuxtjs.csv#L54"
status: active
revision: 1
---

# Declare keys before NUXT_ overrides

Declare every runtimeConfig key in nuxt.config before overriding it with a matching NUXT_ environment variable

**Do:** Declared apiSecret and public.apiBase keys plus NUXT_API_SECRET or NUXT_PUBLIC_API_BASE

**Don't:** Expect an undeclared environment variable to create config

**Applies To:** nuxtjs 4.5

**Severity:** High

**Good example:**

```text
NUXT_PUBLIC_API_BASE=https://api.example.com after declaring public.apiBase
```

**Bad example:**

```text
API_BASE=https://api.example.com
```
