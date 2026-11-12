---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-setfromcamera-and-intersectobjects-in-animate
title: "setFromCamera and intersectObjects in animate"
summary: "Call raycaster.setFromCamera(mouse camera) and then raycaster.intersectObjects(targets true) inside the animate() loop. setFromCamera must come before intersectObjects every frame — without it the raycaster uses a stale ray direction."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L28"
status: active
revision: 1
---

# setFromCamera and intersectObjects in animate

Call raycaster.setFromCamera(mouse camera) and then raycaster.intersectObjects(targets true) inside the animate() loop. setFromCamera must come before intersectObjects every frame — without it the raycaster uses a stale ray direction.

**Do:** Call setFromCamera then intersectObjects in order inside every animate() frame

**Don't:** Call intersectObjects without calling setFromCamera first — the raycaster uses a stale or zero ray

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
function animate() { requestAnimationFrame(animate); raycaster.setFromCamera(mouse, camera); // update ray direction first const hits = raycaster.intersectObjects(targets, true); // then test intersections if (hits.length > 0) { document.body.style.cursor = 'pointer'; } else { document.body.style.cursor = 'auto'; } renderer.render(scene, camera); }
```

**Bad example:**

```text
function animate() { requestAnimationFrame(animate); const hits = raycaster.intersectObjects(targets, true); // BUG: setFromCamera never called — stale ray — hits is always empty renderer.render(scene, camera); }
```
