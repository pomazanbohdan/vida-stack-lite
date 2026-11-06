---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-astro-use-adapter-for-deployment
title: "Use adapter for deployment"
summary: "Platform-specific adapters"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Integrations guidance for astro 7.1.6."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6; locator=stacks/astro.csv#L39"
status: active
revision: 1
---

# Use adapter for deployment

Platform-specific adapters

**Do:** Correct adapter for host

**Don't:** Wrong or no adapter

**Applies To:** astro 7.1.6

**Severity:** High

**Good example:**

```text
@astrojs/vercel for Vercel
```

**Bad example:**

```text
No adapter for SSR
```
