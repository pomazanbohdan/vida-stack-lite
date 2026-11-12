---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-use-field-for-input-structure
title: "Use Field for input structure"
summary: "Compose Field Label and Control for accessible form structure"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Form guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L18"
status: active
revision: 1
---

# Use Field for input structure

Compose Field Label and Control for accessible form structure

**Do:** Field + FieldLabel + Input

**Don't:** Unlabeled input or stale FormItem wrapper

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** High

**Good example:**

```text
<Field><FieldLabel htmlFor='email'>Email</FieldLabel><Input id='email'/></Field>
```

**Bad example:**

```text
<Input placeholder='Email'/>
```
