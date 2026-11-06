---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-astro-validate-api-input
title: "Validate API input"
summary: "Check and sanitize all input"
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "Security guidance for astro 7.1.6."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6; locator=stacks/astro.csv#L51"
status: active
revision: 1
---

# Validate API input

Check and sanitize all input

**Do:** Schema validation for endpoint input

**Don't:** Trust all input

**Applies To:** astro 7.1.6

**Severity:** High

**Good example:**

```text
const body = schema.parse(data)
```

**Bad example:**

```text
const body = await request.json()
```
