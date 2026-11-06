---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-environment-configurations
title: "Use environment configurations"
summary: "Separate environment values for dev staging and prod via Angular build configs"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L50"
status: active
revision: 1
---

# Use environment configurations

Separate environment values for dev staging and prod via Angular build configs

**Do:** angular.json fileReplacements for env configs

**Don't:** Hardcoded API URLs or feature flags in source

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
fileReplacements: [{ replace: environment.ts with: environment.prod.ts }]
```

**Bad example:**

```text
const API = 'https://api.example.com' // hardcoded in service
```
