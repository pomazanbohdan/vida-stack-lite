---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-jetpack-compose-pure-ui-composables
title: "Pure UI composables"
summary: "Composable functions should only render UI"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Composable guidance for jetpack-compose 1.11.4 (current stable)."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/jetpack-compose.csv; sha256=699de218b286948eaec7d15767b6e1350ee299167e49bf476d82e3ff58724e0a; locator=stacks/jetpack-compose.csv#L2"
status: active
revision: 1
---

# Pure UI composables

Composable functions should only render UI

**Do:** Accept state and callbacks

**Don't:** Calling usecase/repo

**Applies To:** jetpack-compose 1.11.4 (current stable)

**Severity:** High

**Good example:**

```text
Pure UI composable
```

**Bad example:**

```text
Business logic in UI
```
