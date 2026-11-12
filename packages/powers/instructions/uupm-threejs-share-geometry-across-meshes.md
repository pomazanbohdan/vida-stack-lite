---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-share-geometry-across-meshes
title: "Share Geometry Across Meshes"
summary: "When multiple objects share the same shape create one geometry instance and pass it to every Mesh. Each Mesh gets its own transform and material while all share a single GPU buffer."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L15"
status: active
revision: 1
---

# Share Geometry Across Meshes

When multiple objects share the same shape create one geometry instance and pass it to every Mesh. Each Mesh gets its own transform and material while all share a single GPU buffer.

**Do:** Create one geometry and pass the same reference to every Mesh constructor

**Don't:** Create a separate identical geometry inside a loop for each object

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
const geo = new THREE.BoxGeometry(1, 1, 1); // one GPU buffer for (let i = 0; i < 200; i++) { const m = new THREE.Mesh(geo, mat); m.position.set(Math.random() * 10, 0, Math.random() * 10); scene.add(m); }
```

**Bad example:**

```text
for (let i = 0; i < 200; i++) { const geo = new THREE.BoxGeometry(1, 1, 1); // 200 separate GPU buffers scene.add(new THREE.Mesh(geo, mat)); }
```
