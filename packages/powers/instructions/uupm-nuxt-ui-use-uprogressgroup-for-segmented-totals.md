---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-uprogressgroup-for-segmented-totals
title: "Use UProgressGroup for segmented totals"
summary: "ProgressGroup displays multiple values as segments of one total with a legend"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Data guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L74"
status: active
revision: 1
---

# Use UProgressGroup for segmented totals

ProgressGroup displays multiple values as segments of one total with a legend

**Do:** Pass labeled items and an explicit max when the total is not 100

**Don't:** Build a segmented progress bar from unrelated div widths

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
<UProgressGroup :items="usage" :max="128" status/>
```

**Bad example:**

```text
<div v-for="item in usage" :style="{ width: item.value + '%' }">
```
