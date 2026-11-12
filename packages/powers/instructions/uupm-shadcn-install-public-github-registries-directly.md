---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-install-public-github-registries-directly
title: "Install public GitHub registries directly"
summary: "A public repository with root registry.json can be addressed as owner/repo/item"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L65"
status: active
revision: 1
---

# Install public GitHub registries directly

A public repository with root registry.json can be addressed as owner/repo/item

**Do:** npx shadcn@latest add owner/repo/item

**Don't:** Require a separately hosted generated registry

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** Medium

**Good example:**

```text
npx shadcn@latest add acme/ui/button
```

**Bad example:**

```text
Copy raw GitHub source files
```
