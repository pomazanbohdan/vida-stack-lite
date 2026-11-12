---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-html-tailwind-compact-label-layout-collection-reflow
title: "Compact label layout (Collection reflow)"
summary: "Use flex flex-wrap gap-2 for collections."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for html-tailwind 4.3."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee; locator=stacks/html-tailwind.csv#L60"
status: active
revision: 1
---

# Compact label layout (Collection reflow)

Handle chip and badge text overflow without hiding collection values

**Do:** Use flex flex-wrap gap-2 for collections

**Don't:** Clip a fixed-height row let labels wrap inside a pill or let dismiss icons shrink

**Applies To:** html-tailwind 4.3

**Severity:** High

**Good example:**

```text
flex flex-wrap gap-2; label min-w-0 whitespace-nowrap truncate; icon shrink-0
```

**Bad example:**

```text
flex h-8 overflow-hidden
```
