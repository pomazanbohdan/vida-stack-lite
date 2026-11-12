---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-segment-count-budget
title: "Segment Count Budget"
summary: "Use the minimum segment count that achieves the desired silhouette quality. Hero objects: 32–64 segments. Background objects: 8–16. Particle stand-ins: 6–8. High counts on background geometry waste GPU draw calls with zero visible benefit."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Geometry guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L17"
status: active
revision: 1
---

# Segment Count Budget

Use the minimum segment count that achieves the desired silhouette quality. Hero objects: 32–64 segments. Background objects: 8–16. Particle stand-ins: 6–8. High counts on background geometry waste GPU draw calls with zero visible benefit.

**Do:** Apply a tiered segment budget based on the visual priority of each object in the scene

**Don't:** Default every sphere and cylinder to 64+ segments regardless of its role

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const bgSphere = new THREE.SphereGeometry(0.5, 8, 8); // background const heroSphere = new THREE.SphereGeometry(1, 64, 64); // foreground product
```

**Bad example:**

```text
const particleSphere = new THREE.SphereGeometry(0.1, 64, 64); // 64 segments × 1000 particles = massive overdraw
```
