---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-use-dropdownmenu-for-actions
title: "Use DropdownMenu for actions"
summary: "DropdownMenu for action lists and context menus"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "DropdownMenu guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L37"
status: active
revision: 1
---

# Use DropdownMenu for actions

DropdownMenu for action lists and context menus

**Do:** DropdownMenu for user menu actions

**Don't:** Popover for action lists

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** Medium

**Good example:**

```text
<DropdownMenu><DropdownMenuTrigger><DropdownMenuContent>
```

**Bad example:**

```text
<Popover> for menu actions
```
