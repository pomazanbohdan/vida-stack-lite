---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-template-studio-for-scaffolding
title: "Use Template Studio for scaffolding"
summary: "Proven project templates with navigation and services"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L45"
status: active
revision: 1
---

# Use Template Studio for scaffolding

Proven project templates with navigation and services

**Do:** Windows Template Studio for new UWP projects

**Don't:** Blank project with manual boilerplate

**Applies To:** uwp legacy

**Severity:** Low

**Good example:**

```text
Template Studio with MVVM Toolkit and navigation service
```

**Bad example:**

```text
Blank App template building everything from scratch
```
