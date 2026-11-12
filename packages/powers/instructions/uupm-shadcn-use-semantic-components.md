---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-use-semantic-components
title: "Use semantic components"
summary: "Shadcn components have built-in ARIA"
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "A11y guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L53"
status: active
revision: 1
---

# Use semantic components

Shadcn components have built-in ARIA

**Do:** Rely on component accessibility

**Don't:** Override ARIA attributes

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** High

**Good example:**

```text
<Button> has button role
```

**Bad example:**

```text
<div role="button">
```
