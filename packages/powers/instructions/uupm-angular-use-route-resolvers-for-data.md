---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-route-resolvers-for-data
title: "Use route resolvers for data"
summary: "Pre-fetch data before route activation using resolve"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Routing guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L12"
status: active
revision: 1
---

# Use route resolvers for data

Pre-fetch data before route activation using resolve

**Do:** ResolveFn for route data

**Don't:** Fetching data in ngOnInit causing flash of empty state

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
resolve: { user: () => inject(UserService).getUser() }
```

**Bad example:**

```text
Fetch in ngOnInit with loading state flickering
```
