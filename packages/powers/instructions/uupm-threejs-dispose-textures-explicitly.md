---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-dispose-textures-explicitly
title: "Dispose Textures Explicitly"
summary: "Textures are the single largest consumer of GPU VRAM in most Three.js scenes. Call texture.dispose() when switching scenes or removing objects — Three.js does not garbage-collect GPU resources automatically."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Materials guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L21"
status: active
revision: 1
---

# Dispose Textures Explicitly

Textures are the single largest consumer of GPU VRAM in most Three.js scenes. Call texture.dispose() when switching scenes or removing objects — Three.js does not garbage-collect GPU resources automatically.

**Do:** Track all loaded textures and call dispose() on each one during scene teardown or on object removal

**Don't:** Load textures without any cleanup path — they persist in VRAM for the entire page lifetime

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const tex = new THREE.TextureLoader().load('img.jpg'); mesh.material.map = tex; // on teardown: tex.dispose(); mesh.material.dispose();
```

**Bad example:**

```text
const tex = new THREE.TextureLoader().load('img.jpg'); scene.remove(mesh); // tex occupies GPU VRAM until page reload
```
