---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-inspect-cli-changes-before-writing
title: "Inspect CLI changes before writing"
summary: "Use CLI v4 dry-run diff and view plus info and docs to inspect project and registry state"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L64"
status: active
revision: 1
---

# Inspect CLI changes before writing

Use CLI v4 dry-run diff and view plus info and docs to inspect project and registry state

**Do:** npx shadcn@latest add button --dry-run

**Don't:** Blindly overwrite customized components

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** High

**Good example:**

```text
npx shadcn@latest add button --diff
```

**Bad example:**

```text
npx shadcn@latest add button without review
```
