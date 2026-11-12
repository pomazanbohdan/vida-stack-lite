---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-i-collection-name-format-for-icons
title: "Use i-{collection}-{name} format for icons"
summary: "Nuxt UI v4 uses Iconify i-prefix format — lucide:home is v3 legacy"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L9"
status: active
revision: 1
---

# Use i-{collection}-{name} format for icons

Nuxt UI v4 uses Iconify i-prefix format — lucide:home is v3 legacy

**Do:** i-lucide-home i-heroicons-user format

**Don't:** lucide:home format (v3 syntax)

**Applies To:** nuxt-ui 4.11.1

**Severity:** High

**Good example:**

```text
<UButton icon="i-lucide-home">
```

**Bad example:**

```text
<UButton icon="lucide:home">
```
