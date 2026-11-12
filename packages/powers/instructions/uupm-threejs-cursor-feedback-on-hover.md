---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-cursor-feedback-on-hover
title: "Cursor Feedback on Hover"
summary: "Set document.body.style.cursor = 'pointer' when intersections are found and reset to 'auto' when none are found. Without cursor feedback users cannot discover that 3D objects are interactive."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L30"
status: active
revision: 1
---

# Cursor Feedback on Hover

Set document.body.style.cursor = 'pointer' when intersections are found and reset to 'auto' when none are found. Without cursor feedback users cannot discover that 3D objects are interactive.

**Do:** Update cursor to pointer on hit; reset to auto on miss in the same animate loop block

**Don't:** Run raycasting and read hits without ever updating the cursor style

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
if (hits.length > 0) { document.body.style.cursor = 'pointer'; } else { document.body.style.cursor = 'auto'; }
```

**Bad example:**

```text
raycaster.setFromCamera(mouse, camera); raycaster.intersectObjects(targets, true); // hits ignored — cursor never changes — objects feel non-interactive
```
