---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-separate-views-from-viewmodels
title: "Separate Views from ViewModels"
summary: "Keep UI and logic in separate projects"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L30"
status: active
revision: 1
---

# Separate Views from ViewModels

Keep UI and logic in separate projects

**Do:** ViewModels in a separate class library

**Don't:** ViewModels in the same project referencing Avalonia types

**Applies To:** avalonia 12

**Severity:** Medium

**Good example:**

```text
MyApp.Core (no Avalonia refs) + MyApp.Desktop (Avalonia views)
```

**Bad example:**

```text
ViewModel importing Avalonia.Controls
```
