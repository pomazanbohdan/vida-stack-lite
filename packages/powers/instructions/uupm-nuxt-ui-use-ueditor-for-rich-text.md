---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-ueditor-for-rich-text
title: "Use UEditor for rich text"
summary: "TipTap-based editor binds its document with v-model"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Editor guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L47"
status: active
revision: 1
---

# Use UEditor for rich text

TipTap-based editor binds its document with v-model

**Do:** UEditor with v-model

**Don't:** Use the undocumented v-model:content binding

**Applies To:** nuxt-ui 4.11.1

**Severity:** Medium

**Good example:**

```text
<UEditor v-model="content"/>
```

**Bad example:**

```text
<UEditor v-model:content="content"/>
```
