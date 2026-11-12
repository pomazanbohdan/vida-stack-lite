---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-to-for-external-urls
title: "Use to for external URLs"
summary: "ULink and link-enabled components detect absolute URLs and support target when a new tab is intended"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Links guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L49"
status: active
revision: 1
---

# Use to for external URLs

ULink and link-enabled components detect absolute URLs and support target when a new tab is intended

**Do:** to="https://example.com" target="_blank"

**Don't:** Use href inconsistently or claim an external prop is required

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
<UButton to="https://example.com" target="_blank">
```

**Bad example:**

```text
<UButton href="https://...">
```
