---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-explicit-position-and-lookat
title: "Explicit Position and lookAt"
summary: "Always set an explicit camera position and call camera.lookAt() before the first render. The default camera at the origin pointing down -Z makes subjects at arbitrary coordinates invisible or tiny."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L12"
status: active
revision: 1
---

# Explicit Position and lookAt

Always set an explicit camera position and call camera.lookAt() before the first render. The default camera at the origin pointing down -Z makes subjects at arbitrary coordinates invisible or tiny.

**Do:** Set camera.position.set() and camera.lookAt() to frame the subject before the first render

**Don't:** Leave the camera at default position (0 0 0) with no lookAt — subject may be behind the camera or microscopic

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
camera.position.set(0, 1.5, 5); camera.lookAt(new THREE.Vector3(0, 0, 0));
```

**Bad example:**

```text
// No position or lookAt set — subject at y:2 is behind or above the default camera view
```
