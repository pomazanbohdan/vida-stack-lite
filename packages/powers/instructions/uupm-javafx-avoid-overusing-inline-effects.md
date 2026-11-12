---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-avoid-overusing-inline-effects
title: "Avoid overusing inline effects"
summary: "Expensive CSS effects and shadows can hurt desktop UI responsiveness"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "CSS guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L12"
status: active
revision: 1
---

# Avoid overusing inline effects

Expensive CSS effects and shadows can hurt desktop UI responsiveness

**Do:** Use subtle shadows only on important elevated surfaces

**Don't:** Apply blur drop shadow and glow to every node

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
.dialog-card { -fx-effect: dropshadow(gaussian, rgba(0,0,0,.18), 16, 0, 0, 4); }
```

**Bad example:**

```text
.table-row-cell { -fx-effect: dropshadow(gaussian, black, 20, .5, 0, 0); }
```
