---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-dispose-on-scene-removal
title: "dispose on Scene Removal"
summary: "Call geometry.dispose() and material.dispose() and texture.dispose() for every texture map when removing objects from the scene. Three.js never releases GPU resources automatically — they stay in VRAM until explicitly freed."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L16"
status: active
revision: 1
---

# dispose on Scene Removal

Call geometry.dispose() and material.dispose() and texture.dispose() for every texture map when removing objects from the scene. Three.js never releases GPU resources automatically — they stay in VRAM until explicitly freed.

**Do:** Dispose of geometry + material + every texture map before calling scene.remove()

**Don't:** Call scene.remove() alone without any dispose calls

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
function removeMesh(mesh) { scene.remove(mesh); mesh.geometry.dispose(); if (mesh.material.map) mesh.material.map.dispose(); if (mesh.material.normalMap) mesh.material.normalMap.dispose(); mesh.material.dispose(); }
```

**Bad example:**

```text
scene.remove(mesh); // geometry and all texture maps stay in GPU VRAM forever
```
