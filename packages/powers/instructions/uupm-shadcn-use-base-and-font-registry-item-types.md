---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-use-base-and-font-registry-item-types
title: "Use base and font registry item types"
summary: "Publish base primitives as registry:base and fonts as registry:font so CLI v4 applies them correctly"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Registry guidance for shadcn cli 4; base=base|radix|aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L63"
status: active
revision: 1
---

# Use base and font registry item types

Publish base primitives as registry:base and fonts as registry:font so CLI v4 applies them correctly

**Do:** Explicit registry item types

**Don't:** Publish every artifact as registry:ui

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** Medium

**Good example:**

```text
type: 'registry:base' or type: 'registry:font'
```

**Bad example:**

```text
type: 'registry:ui' for a base definition
```
