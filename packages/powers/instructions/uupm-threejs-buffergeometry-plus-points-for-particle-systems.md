---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-buffergeometry-plus-points-for-particle-systems
title: "BufferGeometry Plus Points for Particle Systems"
summary: "Build all particle systems with BufferGeometry plus a Float32Array position attribute rendered as Points. Never use individual Mesh objects as particles — they cannot scale past a few hundred with good performance."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Particles guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L44"
status: active
revision: 1
---

# BufferGeometry Plus Points for Particle Systems

Build all particle systems with BufferGeometry plus a Float32Array position attribute rendered as Points. Never use individual Mesh objects as particles — they cannot scale past a few hundred with good performance.

**Do:** Use Points plus BufferGeometry for all particle effects

**Don't:** Create hundreds of individual Mesh objects to simulate a particle system

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const COUNT = 3000; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(COUNT * 3); for (let i = 0; i < COUNT * 3; i++) pos[i] = (Math.random() - 0.5) * 20; geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const particles = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, color: 0xffffff })); scene.add(particles);
```

**Bad example:**

```text
for (let i = 0; i < 500; i++) { scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat)); } // 500 separate draw calls per frame
```
