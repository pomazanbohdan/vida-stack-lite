---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-astro-keep-astro-for-static
title: "Keep .astro for static"
summary: "Use .astro components for static content"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Components guidance for astro 7.1.6."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6; locator=stacks/astro.csv#L11"
status: active
revision: 1
---

# Keep .astro for static

Use .astro components for static content

**Do:** Astro components for layout structure

**Don't:** React/Vue for static markup

**Applies To:** astro 7.1.6

**Severity:** High

**Good example:**

```text
<Layout><slot /></Layout>
```

**Bad example:**

```text
<ReactLayout>{children}</ReactLayout>
```
