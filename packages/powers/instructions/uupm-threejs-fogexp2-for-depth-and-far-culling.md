---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-fogexp2-for-depth-and-far-culling
title: "FogExp2 for Depth and Far Culling"
summary: "Use scene.fog to create atmospheric depth. As a secondary benefit objects that disappear into fog before the far plane stop contributing to draw calls — useful in scenes with large view distances."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L43"
status: active
revision: 1
---

# FogExp2 for Depth and Far Culling

Use scene.fog to create atmospheric depth. As a secondary benefit objects that disappear into fog before the far plane stop contributing to draw calls — useful in scenes with large view distances.

**Do:** Add FogExp2 to scenes with view distances above 100 units for both visual atmosphere and implicit far culling

**Don't:** Ignore fog in scenes with far:1000+ and many distant objects that contribute tiny pixels per draw call

**Applies To:** threejs 0.185.1

**Severity:** Low

**Good example:**

```text
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02); // exponential — density feels more natural than linear
```

**Bad example:**

```text
// far: 2000 with no fog — hundreds of distant objects too small to see still cost draw calls per frame
```
