---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-tween-three-js-properties-directly
title: "Tween Three.js Properties Directly"
summary: "GSAP can tween any numeric JavaScript property including mesh.position.x mesh.rotation.y and material.opacity. No wrapper or adaptor is needed. Note: to tween material.opacity the material must have transparent:true set before the tween starts."
capability_tags:
  - design-microinteraction
pattern_tags:
  - choreographed-motion
conditions_applies_when: "GSAP guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L38"
status: active
revision: 1
---

# Tween Three.js Properties Directly

GSAP can tween any numeric JavaScript property including mesh.position.x mesh.rotation.y and material.opacity. No wrapper or adaptor is needed. Note: to tween material.opacity the material must have transparent:true set before the tween starts.

**Do:** Pass Three.js object properties directly to gsap.to(); set transparent:true before tweening opacity

**Don't:** Use a plain proxy object then manually copy values to Three.js properties every frame

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
gsap.to(mesh.rotation, { y: Math.PI * 2, duration: 2, ease: 'power1.inOut' }); mesh.material.transparent = true; // required before tweening opacity gsap.to(mesh.material, { opacity: 0, duration: 1 });
```

**Bad example:**

```text
const tw = { v: 0 }; gsap.to(tw, { v: Math.PI * 2, onUpdate: () => mesh.rotation.y = tw.v }); // unnecessary proxy wrapper
```
