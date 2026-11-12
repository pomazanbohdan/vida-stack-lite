---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-vue-use-v-model-modifiers
title: "Use v-model modifiers"
summary: "Built-in input handling"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for vue 3.5.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95; locator=stacks/vue.csv#L45"
status: active
revision: 1
---

# Use v-model modifiers

Built-in input handling

**Do:** .lazy .number .trim modifiers

**Don't:** Manual input parsing

**Applies To:** vue 3.5.x

**Severity:** Low

**Good example:**

```text
<input v-model.number="age">
```

**Bad example:**

```text
<input v-model="age"> then parse
```
