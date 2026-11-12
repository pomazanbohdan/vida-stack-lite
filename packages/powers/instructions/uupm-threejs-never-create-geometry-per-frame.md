---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-never-create-geometry-per-frame
title: "Never Create Geometry Per Frame"
summary: "Creating a new geometry inside animate() allocates a fresh GPU buffer every frame and exhausts VRAM within seconds. Create all geometry exactly once before the loop starts. Use attribute mutation if positions must change per frame."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L14"
status: active
revision: 1
---

# Never Create Geometry Per Frame

Creating a new geometry inside animate() allocates a fresh GPU buffer every frame and exhausts VRAM within seconds. Create all geometry exactly once before the loop starts. Use attribute mutation if positions must change per frame.

**Do:** Create all geometry before the animation loop; mutate BufferAttribute arrays in-place if needed

**Don't:** Call any new XxxGeometry() constructor inside the animation loop

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
const geo = new THREE.SphereGeometry(1, 32, 32); // created once const mesh = new THREE.Mesh(geo, mat); scene.add(mesh); const timer = new THREE.Timer(); function animate(timestamp) { requestAnimationFrame(animate); timer.update(timestamp); mesh.rotation.y += timer.getDelta() * 0.8; // delta time renderer.render(scene, camera); }
```

**Bad example:**

```text
function animate() { requestAnimationFrame(animate); const geo = new THREE.BoxGeometry(1, 1, 1); // NEW GPU buffer every frame — VRAM exhaustion }
```
