---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-defineshortcuts-whenever-keyword-shortcut
title: "Use defineShortcuts whenever keyword shortcut"
summary: "whenever array condition prevents shortcut firing when inactive"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Composables guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L70"
status: active
revision: 1
---

# Use defineShortcuts whenever keyword shortcut

whenever array condition prevents shortcut firing when inactive

**Do:** whenever: [isFormValid] to guard shortcut execution

**Don't:** Always-on shortcuts that fire in wrong context

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
defineShortcuts({ meta_enter: { handler: submit, whenever: [isFormValid] } })
```

**Bad example:**

```text
defineShortcuts({ meta_enter: () => submit() }) // fires even when invalid
```
