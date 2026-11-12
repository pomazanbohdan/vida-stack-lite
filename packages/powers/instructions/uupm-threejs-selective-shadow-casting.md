---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-selective-shadow-casting
title: "Selective Shadow Casting"
summary: "Shadow map rendering redraws the entire scene from the light's perspective every frame. Enable castShadow only on the primary directional light and receiveShadow only on hero meshes and the ground plane."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L24"
status: active
revision: 1
---

# Selective Shadow Casting

Shadow map rendering redraws the entire scene from the light's perspective every frame. Enable castShadow only on the primary directional light and receiveShadow only on hero meshes and the ground plane.

**Do:** Enable shadows only on the key light and the most important meshes

**Don't:** Enable castShadow and receiveShadow on every object in the scene including particles

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; dirLight.castShadow = true; heroMesh.castShadow = true; ground.receiveShadow = true; // particles and background meshes: no shadow flags
```

**Bad example:**

```text
for (const m of allMeshes) { m.castShadow = true; m.receiveShadow = true; } // shadow map pass over particle system — expensive with no visible gain
```
