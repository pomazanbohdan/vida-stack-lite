---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-ux-cancellable-state-transitions
title: "Cancellable State Transitions"
summary: "Rapid compact-control changes can interrupt an in-flight transition"
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Animation guidance for Web interfaces."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5; locator=ux-guidelines.csv#L120"
status: active
revision: 1
---

# Cancellable State Transitions

Rapid compact-control changes can interrupt an in-flight transition

**Do:** Cancel or replace prior motion; set the final semantic state directly and handle cancellation cleanup

**Don't:** Depend on animationend or transitionend for required state correctness

**Platform:** Web

**Severity:** High

**Good example:**

```text
previous?.cancel(); setSelected(next)
```

**Bad example:**

```text
Enable the chip only inside transitionend
```
