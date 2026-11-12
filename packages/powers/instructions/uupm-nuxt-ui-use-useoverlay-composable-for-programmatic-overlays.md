---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-useoverlay-composable-for-programmatic-overlays
title: "Use useOverlay composable for programmatic overlays"
summary: "Open overlays programmatically — v4 API is create().open() not open(Component)"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L19"
status: active
revision: 1
---

# Use useOverlay composable for programmatic overlays

Open overlays programmatically — v4 API is create().open() not open(Component)

**Do:** Create the overlay once, then pass component props directly to open()

**Don't:** v3 overlay.open(Component) pattern (removed in v4)

**Applies To:** nuxt-ui 4.11.1

**Severity:** High

**Good example:**

```text
const modal = overlay.create(MyModal); const { result } = modal.open({ title: 'Confirm' })
```

**Bad example:**

```text
overlay.open(MyModal, { props: { title: 'Confirm' } })
```
