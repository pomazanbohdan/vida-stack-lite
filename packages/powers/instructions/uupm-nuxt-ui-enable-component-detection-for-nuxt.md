---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-enable-component-detection-for-nuxt
title: "Enable component detection for Nuxt"
summary: "Generate CSS only for detected Nuxt UI components and their dependencies"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L39"
status: active
revision: 1
---

# Enable component detection for Nuxt

Generate CSS only for detected Nuxt UI components and their dependencies

**Do:** Use true for static usage or include dynamic component names in an array

**Don't:** Enable detection and omit components rendered through dynamic :is values

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
ui: { experimental: { componentDetection: ['Modal'] } }
```

**Bad example:**

```text
componentDetection: true with <component :is="name"/> only
```
