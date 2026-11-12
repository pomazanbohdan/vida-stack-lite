---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-await-overlay-result-for-confirmation-dialogs
title: "Await overlay result for confirmation dialogs"
summary: "open() returns a Promise that resolves when the overlay component emits close"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Overlays guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L63"
status: active
revision: 1
---

# Await overlay result for confirmation dialogs

open() returns a Promise that resolves when the overlay component emits close

**Do:** Emit a close value from the overlay component and await modal.open()

**Don't:** Expect a result from a component that never emits close

**Applies To:** nuxt-ui 4.11.1

**Severity:** Medium

**Good example:**

```text
if (await modal.open()) { deleteItem() }
```

**Bad example:**

```text
modal.open(); deleteItem()
```
