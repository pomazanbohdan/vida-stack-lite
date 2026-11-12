---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-aspect-ratio-on-resize
title: "Aspect Ratio on Resize"
summary: "Always update camera.aspect and call camera.updateProjectionMatrix() inside every resize handler. A stale aspect ratio causes the entire scene to appear stretched or squashed horizontally."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - craft-detail
conditions_applies_when: "Camera guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L10"
status: active
revision: 1
---

# Aspect Ratio on Resize

Always update camera.aspect and call camera.updateProjectionMatrix() inside every resize handler. A stale aspect ratio causes the entire scene to appear stretched or squashed horizontally.

**Do:** Update camera.aspect then call updateProjectionMatrix() on every resize

**Don't:** Let aspect ratio become stale after the browser window changes size

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
window.addEventListener('resize', () => { camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight); });
```

**Bad example:**

```text
// No resize handler — scene stretches to fill a wider window without correcting the projection
```
