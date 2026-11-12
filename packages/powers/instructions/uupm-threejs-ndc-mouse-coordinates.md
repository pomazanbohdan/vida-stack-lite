---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-ndc-mouse-coordinates
title: "NDC Mouse Coordinates"
summary: "Raycasting requires mouse in Normalized Device Coordinates: X from -1 (left) to +1 (right) and Y from +1 (top) to -1 (bottom). The Y axis is inverted relative to screen space. A missing negation on Y causes all raycasts to miss or hit the wrong objects."
capability_tags:
  - design-user-interface
pattern_tags:
  - predictable-rules
conditions_applies_when: "Raycasting guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L27"
status: active
revision: 1
---

# NDC Mouse Coordinates

Raycasting requires mouse in Normalized Device Coordinates: X from -1 (left) to +1 (right) and Y from +1 (top) to -1 (bottom). The Y axis is inverted relative to screen space. A missing negation on Y causes all raycasts to miss or hit the wrong objects.

**Do:** Apply the full NDC formula — including the negation on the Y axis

**Don't:** Forget to negate Y — raycasting appears to work but hits objects mirrored vertically

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1; mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1; // Y is INVERTED
```

**Bad example:**

```text
mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1; mouse.y = (e.clientY / canvas.clientHeight) * 2 - 1; // BUG: Y not negated — raycasting is mirrored
```
