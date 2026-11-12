---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-single-shared-raycaster
title: "Single Shared Raycaster"
summary: "Create exactly one Raycaster instance outside all event handlers. Store mouse coordinates in pointermove (cheap). Call setFromCamera and intersectObjects together inside the animate() loop — once per frame instead of once per mouse event."
capability_tags:
  - design-user-interface
pattern_tags:
  - predictable-rules
conditions_applies_when: "Raycasting guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L26"
status: active
revision: 1
---

# Single Shared Raycaster

Create exactly one Raycaster instance outside all event handlers. Store mouse coordinates in pointermove (cheap). Call setFromCamera and intersectObjects together inside the animate() loop — once per frame instead of once per mouse event.

**Do:** Create one Raycaster; store mouse in pointermove; call setFromCamera + intersectObjects inside animate()

**Don't:** Create a new THREE.Raycaster() inside a mousemove handler or call setFromCamera inside the event listener

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2(); canvas.addEventListener('pointermove', e => { // only store coords — no raycasting here mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1; mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1; }); // setFromCamera and intersectObjects run once per frame in animate()
```

**Bad example:**

```text
window.addEventListener('mousemove', e => { const rc = new THREE.Raycaster(); // new allocation per event rc.setFromCamera(mouse, camera); rc.intersectObjects(targets, true); // fires 200+ times/sec });
```
