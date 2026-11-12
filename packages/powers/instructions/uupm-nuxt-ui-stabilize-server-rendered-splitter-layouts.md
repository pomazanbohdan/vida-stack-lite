---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-stabilize-server-rendered-splitter-layouts
title: "Stabilize server-rendered splitter layouts"
summary: "Generated ids and mixed default sizes can cause hydration mismatches or panel jumps"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L73"
status: active
revision: 1
---

# Stabilize server-rendered splitter layouts

Generated ids and mixed default sizes can cause hydration mismatches or panel jumps

**Do:** Set id and give defaultSize to every item or to none; use auto-save-id for persistence

**Don't:** Mix items with and without defaultSize during SSR

**Applies To:** nuxt-ui 4.11.1

**Severity:** High

**Good example:**

```text
<USplitter id="layout" auto-save-id="layout" :items="sizedItems">
```

**Bad example:**

```text
<USplitter :items="mixedDefaultSizes">
```
