---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-skip-lights-for-meshbasicmaterial
title: "Skip Lights for MeshBasicMaterial"
summary: "MeshBasicMaterial completely ignores all scene lights. Adding lights solely to illuminate BasicMaterial objects wastes a light pass on every frame with zero visible effect."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L25"
status: active
revision: 1
---

# Skip Lights for MeshBasicMaterial

MeshBasicMaterial completely ignores all scene lights. Adding lights solely to illuminate BasicMaterial objects wastes a light pass on every frame with zero visible effect.

**Do:** Omit lights entirely when every material in the scene is MeshBasicMaterial

**Don't:** Add AmbientLight and DirectionalLight to a scene that uses only MeshBasicMaterial

**Applies To:** threejs 0.185.1

**Severity:** Low

**Good example:**

```text
// Scene uses only MeshBasicMaterial — no lights needed const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); const mesh = new THREE.Mesh(geo, mat); scene.add(mesh); // MeshBasicMaterial is always fully lit by definition
```

**Bad example:**

```text
scene.add(new THREE.AmbientLight(0xffffff, 1.0)); // wasted per-frame light pass — BasicMaterial ignores it entirely
```
