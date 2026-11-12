---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-custom-drag-orbit-fallback
title: "Custom Drag Orbit Fallback"
summary: "When OrbitControls cannot be loaded implement spherical orbit using mousedown/mousemove/mouseup. The key is rotating in spherical coordinates so both horizontal AND vertical drag work correctly."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Setup guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L5"
status: active
revision: 1
---

# Custom Drag Orbit Fallback

When OrbitControls cannot be loaded implement spherical orbit using mousedown/mousemove/mouseup. The key is rotating in spherical coordinates so both horizontal AND vertical drag work correctly.

**Do:** Rotate camera in spherical coordinates so both axes respond correctly to drag

**Don't:** Move camera.position.x directly — vertical drag is silently ignored and the orbit is incorrect

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
let dragging = false; let prev = { x: 0, y: 0 }; const radius = camera.position.length(); let theta = 0; let phi = Math.PI / 2; canvas.addEventListener('mousedown', () => dragging = true); canvas.addEventListener('mouseup', () => dragging = false); canvas.addEventListener('mousemove', e => { if (!dragging) return; theta -= (e.clientX - prev.x) * 0.005; phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - (e.clientY - prev.y) * 0.005)); camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta)); camera.lookAt(scene.position); prev = { x: e.clientX, y: e.clientY }; });
```

**Bad example:**

```text
let dragging = false; let prev = { x: 0, y: 0 }; canvas.addEventListener('mousemove', e => { if (!dragging) return; camera.position.x += (e.clientX - prev.x) * 0.005; camera.lookAt(scene.position); prev = { x: e.clientX, y: e.clientY }; }); // BUG: Y-drag ignored; orbit is a horizontal slide not a sphere
```
