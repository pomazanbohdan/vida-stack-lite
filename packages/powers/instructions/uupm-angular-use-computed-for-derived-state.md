---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-computed-for-derived-state
title: "Use computed() for derived state"
summary: "Lazily evaluated derived values that update when dependencies change"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "State guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L17"
status: active
revision: 1
---

# Use computed() for derived state

Lazily evaluated derived values that update when dependencies change

**Do:** computed() for values derived from other signals

**Don't:** Duplicated state or manual sync

**Applies To:** angular 22.x

**Severity:** High

**Good example:**

```text
readonly total = computed(() => this.items().reduce((s i) => s + i.price 0))
```

**Bad example:**

```text
this.total = this.items.reduce(...) // called manually
```
