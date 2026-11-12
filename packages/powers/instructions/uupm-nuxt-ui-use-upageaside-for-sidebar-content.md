---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-upageaside-for-sidebar-content
title: "Use UPageAside for sidebar content"
summary: "Sidebar that hides below lg breakpoint automatically"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L67"
status: active
revision: 1
---

# Use UPageAside for sidebar content

Sidebar that hides below lg breakpoint automatically

**Do:** UPageAside for docs and landing page sidebars

**Don't:** Manual hidden lg: classes

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
<UPageAside><UNavigationMenu orientation="vertical"/></UPageAside>
```

**Bad example:**

```text
<aside class="hidden lg:block">
```
