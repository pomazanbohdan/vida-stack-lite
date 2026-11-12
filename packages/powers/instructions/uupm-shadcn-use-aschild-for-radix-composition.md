---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-use-aschild-for-radix-composition
title: "Use asChild for Radix composition"
summary: "Radix-based components support asChild for polymorphic composition"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Patterns guidance for shadcn cli 4; base=radix."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L60"
status: active
revision: 1
---

# Use asChild for Radix composition

Radix-based components support asChild for polymorphic composition

**Do:** Use asChild only when the installed Radix component exposes it

**Don't:** Assume Base UI or React Aria components share the Radix API

**Applies To:** shadcn cli 4; base=radix

**Severity:** Medium

**Good example:**

```text
<Button asChild><Link href="/">
```

**Bad example:**

```text
<Button><Link href="/"></Link></Button>
```
