---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-vue-lazy-load-route-components
title: "Lazy load route components"
summary: "Code splitting for routes"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Routing guidance for vue 3.5.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95; locator=stacks/vue.csv#L34"
status: active
revision: 1
---

# Lazy load route components

Code splitting for routes

**Do:** () => import() for components

**Don't:** Static imports for all routes

**Applies To:** vue 3.5.x

**Severity:** Medium

**Good example:**

```text
component: () => import('./Page.vue')
```

**Bad example:**

```text
component: Page
```
