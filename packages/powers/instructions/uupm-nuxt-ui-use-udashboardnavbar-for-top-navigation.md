---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxt-ui-use-udashboardnavbar-for-top-navigation
title: "Use UDashboardNavbar for top navigation"
summary: "Responsive dashboard header with sidebar toggle and layout slots"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Dashboard guidance for nuxt-ui 4.11.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxt-ui.csv; sha256=fce682a338cfcdbf35d318d20e5befbe7b5d81b05abc37f87677a6d9cde84dc6; locator=stacks/nuxt-ui.csv#L23"
status: active
revision: 1
---

# Use UDashboardNavbar for top navigation

Responsive dashboard header with sidebar toggle and layout slots

**Do:** Place UDashboardNavbar in a UDashboardPanel header and use its slots for actions

**Don't:** Pass unsupported links props or rebuild the responsive toggle

**Applies To:** nuxt-ui 4.11.1

**Severity:** Low

**Good example:**

```text
<UDashboardNavbar title="Dashboard"><template #right><UButton label="Add"/></template></UDashboardNavbar>
```

**Bad example:**

```text
<UDashboardNavbar :links="navLinks"/>
```
