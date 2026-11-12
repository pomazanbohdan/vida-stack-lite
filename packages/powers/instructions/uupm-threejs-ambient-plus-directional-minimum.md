---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-ambient-plus-directional-minimum
title: "Ambient Plus Directional Minimum"
summary: "Any scene using MeshStandardMaterial or MeshPhongMaterial requires at minimum one AmbientLight (fill) and one DirectionalLight (shading direction). Without both the objects render as solid black — the material is there but no light reaches it."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - performance-as-design
conditions_applies_when: "Lighting guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L22"
status: active
revision: 1
---

# Ambient Plus Directional Minimum

Any scene using MeshStandardMaterial or MeshPhongMaterial requires at minimum one AmbientLight (fill) and one DirectionalLight (shading direction). Without both the objects render as solid black — the material is there but no light reaches it.

**Do:** Add AmbientLight for fill and DirectionalLight for shading whenever PBR or Phong materials are used

**Don't:** Use MeshStandardMaterial without adding any lights to the scene

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
scene.add(new THREE.AmbientLight(0xffffff, 0.4)); const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); dirLight.position.set(5, 10, 7.5); scene.add(dirLight);
```

**Bad example:**

```text
const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4f46e5 })); scene.add(mesh); // renders completely black — no lights in scene
```
