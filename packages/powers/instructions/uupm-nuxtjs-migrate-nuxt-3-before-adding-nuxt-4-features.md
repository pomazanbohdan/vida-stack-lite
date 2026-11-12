---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxtjs-migrate-nuxt-3-before-adding-nuxt-4-features
title: "Migrate Nuxt 3 before adding Nuxt 4 features"
summary: "Nuxt 3 is end-of-life; use Nuxt 4 compatibility mode to surface directory app-config runtime-config and API changes"
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - migration-strategy
conditions_applies_when: "Migration guidance for nuxtjs legacy 3.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176; locator=stacks/nuxtjs.csv#L68"
status: active
revision: 1
---

# Migrate Nuxt 3 before adding Nuxt 4 features

Nuxt 3 is end-of-life; use Nuxt 4 compatibility mode to surface directory app-config runtime-config and API changes

**Do:** Enable compatibilityVersion 4 and resolve migration warnings

**Don't:** Keep an unmaintained Nuxt 3 app while adopting Nuxt 4-only guidance

**Applies To:** nuxtjs legacy 3.x

**Severity:** High

**Good example:**

```text
future: { compatibilityVersion: 4 }
```

**Bad example:**

```text
// Nuxt 3 retained without an upgrade plan
```
