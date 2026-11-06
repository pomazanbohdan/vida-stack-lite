---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-set-automationproperties
title: "Set AutomationProperties"
summary: "Enable screen reader support"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L31"
status: active
revision: 1
---

# Set AutomationProperties

Enable screen reader support

**Do:** AutomationProperties.Name on interactive controls

**Don't:** Controls without accessible names

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
<Button AutomationProperties.Name="Close dialog"><PathIcon Data="..."/></Button>
```

**Bad example:**

```text
<Button><PathIcon/></Button> without accessible name
```
