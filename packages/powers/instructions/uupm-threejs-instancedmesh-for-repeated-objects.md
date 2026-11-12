---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-instancedmesh-for-repeated-objects
title: "InstancedMesh for Repeated Objects"
summary: "Use THREE.InstancedMesh when rendering 50 or more identical objects. It submits all N transforms in one draw call instead of N draw calls and reduces CPU-GPU communication overhead dramatically."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L40"
status: active
revision: 1
---

# InstancedMesh for Repeated Objects

Use THREE.InstancedMesh when rendering 50 or more identical objects. It submits all N transforms in one draw call instead of N draw calls and reduces CPU-GPU communication overhead dramatically.

**Do:** Use InstancedMesh for any group of 50+ meshes sharing the same geometry and material

**Don't:** Create 50+ separate Mesh objects with the same geometry and material

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const COUNT = 500; const iMesh = new THREE.InstancedMesh(geo, mat, COUNT); const matrix = new THREE.Matrix4(); for (let i = 0; i < COUNT; i++) { matrix.setPosition(Math.random()*10, Math.random()*10, Math.random()*10); iMesh.setMatrixAt(i, matrix); } iMesh.instanceMatrix.needsUpdate = true; scene.add(iMesh);
```

**Bad example:**

```text
for (let i = 0; i < 500; i++) { scene.add(new THREE.Mesh(geo, mat)); } // 500 separate draw calls per frame
```
