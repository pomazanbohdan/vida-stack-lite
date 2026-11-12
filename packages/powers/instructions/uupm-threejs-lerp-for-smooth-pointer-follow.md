---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-lerp-for-smooth-pointer-follow
title: "Lerp for Smooth Pointer Follow"
summary: "Use value += (target - value) * alpha each frame to smoothly interpolate toward a moving target. An alpha of 0.03–0.1 produces organic easing for camera follow pointer-tracking and hover scale effects without requiring GSAP."
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Animation guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L33"
status: active
revision: 1
---

# Lerp for Smooth Pointer Follow

Use value += (target - value) * alpha each frame to smoothly interpolate toward a moving target. An alpha of 0.03–0.1 produces organic easing for camera follow pointer-tracking and hover scale effects without requiring GSAP.

**Do:** Apply the lerp formula each frame with a small alpha for smooth organic motion

**Don't:** Snap a value directly to the target producing an instant jarring jump

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
// In animate(): cameraTargetX = mouse.x * 3; camera.position.x += (cameraTargetX - camera.position.x) * 0.05; camera.position.y += (cameraTargetY - camera.position.y) * 0.05; camera.lookAt(scene.position);
```

**Bad example:**

```text
// In animate(): camera.position.x = mouse.x * 3; // instant snap — jarring with no easing
```
