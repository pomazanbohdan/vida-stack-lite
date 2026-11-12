---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-gltfloader-with-scene-traverse
title: "GLTFLoader with scene traverse"
summary: "Load 3D models using GLTFLoader and traverse gltf.scene to configure castShadow receiveShadow and material overrides on all child Mesh nodes. Calling scene.add(gltf.scene) alone silently skips all shadow and material configuration."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Production guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L53"
status: active
revision: 1
---

# GLTFLoader with scene traverse

Load 3D models using GLTFLoader and traverse gltf.scene to configure castShadow receiveShadow and material overrides on all child Mesh nodes. Calling scene.add(gltf.scene) alone silently skips all shadow and material configuration.

**Do:** Use GLTFLoader and traverse the entire gltf.scene graph to set up shadows and materials on every Mesh child

**Don't:** Load a GLTF model and pass gltf.scene directly to scene.add without traversing child meshes

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const loader = new GLTFLoader(); loader.load('model.glb', gltf => { gltf.scene.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } }); scene.add(gltf.scene); });
```

**Bad example:**

```text
loader.load('model.glb', gltf => { scene.add(gltf.scene); // shadows and material setup silently skipped on all children });
```
