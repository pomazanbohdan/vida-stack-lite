---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-vue-access-ref-values-with-value
title: "Access ref values with .value"
summary: "Remember .value in script unwrap in template"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Reactivity guidance for vue 3.5.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/vue.csv; sha256=b655f1ebb9dff2652d15981f31b1784c8a6d4759efd2815a14f3088257569f95; locator=stacks/vue.csv#L6"
status: active
revision: 1
---

# Access ref values with .value

Remember .value in script unwrap in template

**Do:** Use .value in script

**Don't:** Forget .value in script

**Applies To:** vue 3.5.x

**Severity:** High

**Good example:**

```text
count.value++
```

**Bad example:**

```text
count++ (in script)
```
