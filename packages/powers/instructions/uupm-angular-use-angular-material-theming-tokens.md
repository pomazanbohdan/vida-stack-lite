---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-angular-material-theming-tokens
title: "Use Angular Material theming tokens"
summary: "Material 3 uses design tokens for systematic theming"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L46"
status: active
revision: 1
---

# Use Angular Material theming tokens

Material 3 uses design tokens for systematic theming

**Do:** M3 token-based theming for Angular Material

**Don't:** Overriding Angular Material CSS with deep selectors

**Applies To:** angular 22.x

**Severity:** Medium

**Good example:**

```text
@include mat.button-theme($my-theme)
```

**Bad example:**

```text
::ng-deep .mat-button { background: red }
```
