---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-group-command-items
title: "Group command items"
summary: "Use CommandGroup for categorized items"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Command guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L24"
status: active
revision: 1
---

# Group command items

Use CommandGroup for categorized items

**Do:** CommandGroup with heading for sections

**Don't:** Flat list without grouping

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** Low

**Good example:**

```text
<CommandGroup heading="Suggestions"><CommandItem>
```

**Bad example:**

```text
<CommandItem> without groups
```
