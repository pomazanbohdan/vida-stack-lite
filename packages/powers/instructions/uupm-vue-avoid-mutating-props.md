---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-vue-avoid-mutating-props
title: "Avoid mutating props"
summary: "Props should be read-only"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Props guidance for vue 3.5.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95; locator=stacks/vue.csv#L14"
status: active
revision: 1
---

# Avoid mutating props

Props should be read-only

**Do:** Emit events to parent for changes

**Don't:** Direct prop mutation

**Applies To:** vue 3.5.x

**Severity:** High

**Good example:**

```text
emit('update:modelValue', newVal)
```

**Bad example:**

```text
props.modelValue = newVal
```
