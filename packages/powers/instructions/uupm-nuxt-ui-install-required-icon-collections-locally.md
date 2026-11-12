---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-install-required-icon-collections-locally
title: "Install required icon collections locally"
summary: "Install the Iconify JSON collections used by the app for reliable SSR and bundling"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Icons guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L54"
status: active
revision: 1
---

# Install required icon collections locally

Install the Iconify JSON collections used by the app for reliable SSR and bundling

**Do:** pnpm i @iconify-json/lucide for lucide icons

**Don't:** Rely on an unavailable collection at runtime

**Applies To:** nuxt-ui 4.11.1

**Severity:** Medium

**Good example:**

```text
pnpm i @iconify-json/lucide
```

**Bad example:**

```text
Use i-custom-* without installing its collection
```
