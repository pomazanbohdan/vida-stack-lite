---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-select-an-explicit-component-base
title: "Select an explicit component base"
summary: "CLI v4 supports base radix and aria; Base UI is the new-project default while existing projects retain their base"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Setup guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L62"
status: active
revision: 1
---

# Select an explicit component base

CLI v4 supports base radix and aria; Base UI is the new-project default while existing projects retain their base

**Do:** Pin --base in non-interactive automation

**Don't:** Infer that an existing Radix project must migrate

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** High

**Good example:**

```text
npx shadcn@latest init --base aria
```

**Bad example:**

```text
Assume every base supports asChild
```
