---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-orbitcontrols-vs-gsap-camera-rig
title: "OrbitControls vs GSAP Camera Rig"
summary: "Use OrbitControls for model viewers and exploratory scenes where the user needs free-look. Use a GSAP scroll-driven camera rig for product reveals or storytelling where the camera path must stay fixed."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L13"
status: active
revision: 1
---

# OrbitControls vs GSAP Camera Rig

Use OrbitControls for model viewers and exploratory scenes where the user needs free-look. Use a GSAP scroll-driven camera rig for product reveals or storytelling where the camera path must stay fixed.

**Do:** Import OrbitControls from three/addons and match the camera control approach to the scene's UX intent

**Don't:** Use OrbitControls for a scripted reveal where users can orbit away before it completes

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; // call controls.update() in animate()
```

**Bad example:**

```text
const controls = new THREE.OrbitControls(camera, renderer.domElement); // legacy global API and wrong control model for a scripted reveal
```
