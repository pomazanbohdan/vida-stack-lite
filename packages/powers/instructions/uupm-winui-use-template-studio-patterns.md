---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-winui-use-template-studio-patterns
title: "Use Template Studio patterns"
summary: "Start with proven architectural templates"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for winui current windows app sdk."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/winui.csv; sha256=e676dc1c13ee6c205c40b0746f1335150a346c7a49a0616d2545bc3d2c930c85; locator=stacks/winui.csv#L40"
status: active
revision: 1
---

# Use Template Studio patterns

Start with proven architectural templates

**Do:** Template Studio for WinUI 3 project scaffolding

**Don't:** Blank project with manual setup for complex apps

**Applies To:** winui current windows app sdk

**Severity:** Low

**Good example:**

```text
WinUI 3 Template Studio with MVVM and navigation
```

**Bad example:**

```text
Blank App template for production app
```
