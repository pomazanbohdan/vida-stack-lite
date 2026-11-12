---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-use-capsulegeometry-for-capsule-shapes
title: "Use CapsuleGeometry for Capsule Shapes"
summary: "CapsuleGeometry is part of the current Three.js geometry API and directly creates a capsule from radius length cap segments and radial segments."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Setup guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L3"
status: active
revision: 1
---

# Use CapsuleGeometry for Capsule Shapes

CapsuleGeometry is part of the current Three.js geometry API and directly creates a capsule from radius length cap segments and radial segments.

**Do:** Construct current capsule meshes with THREE.CapsuleGeometry

**Don't:** Rebuild a standard capsule from separate cylinder and sphere meshes unless custom topology is required

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8); const capsule = new THREE.Mesh(geometry, material);
```

**Bad example:**

```text
const body = new THREE.CylinderGeometry(0.5, 0.5, 1); // unnecessary multi-mesh workaround
```
