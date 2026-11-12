---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-html-tailwind-jit-mode-migration
title: "JIT mode migration"
summary: "Tailwind v3 made JIT the default; remove obsolete mode configuration during migration"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for html-tailwind legacy 3.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee; locator=stacks/html-tailwind.csv#L45"
status: active
revision: 1
---

# JIT mode migration

Tailwind v3 made JIT the default; remove obsolete mode configuration during migration

**Do:** Use the v3 default compiler behavior

**Don't:** Keep mode:'jit' as a current v4 requirement

**Applies To:** html-tailwind legacy 3.x

**Severity:** Medium

**Good example:**

```text
Tailwind v3 defaults
```

**Bad example:**

```text
mode: 'jit'
```
