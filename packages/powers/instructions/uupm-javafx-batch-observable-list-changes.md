---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-batch-observable-list-changes
title: "Batch observable list changes"
summary: "Many single-item updates can cause repeated layout and sort work"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L41"
status: active
revision: 1
---

# Batch observable list changes

Many single-item updates can cause repeated layout and sort work

**Do:** Use setAll or addAll for bulk replacement

**Don't:** Loop add items one by one to visible lists

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
items.setAll(repository.findAll());
```

**Bad example:**

```text
for(Item item : loaded) items.add(item);
```
