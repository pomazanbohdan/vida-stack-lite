---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-register-scrolltrigger-before-use
title: "Register ScrollTrigger Before Use"
summary: "Call gsap.registerPlugin(ScrollTrigger) once at the top of your script before any scrollTrigger config object. Without registration the ScrollTrigger name is undefined and the tween throws immediately."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L37"
status: active
revision: 1
---

# Register ScrollTrigger Before Use

Call gsap.registerPlugin(ScrollTrigger) once at the top of your script before any scrollTrigger config object. Without registration the ScrollTrigger name is undefined and the tween throws immediately.

**Do:** Call gsap.registerPlugin(ScrollTrigger) as the first line before any gsap.to/from/timeline with scrollTrigger

**Don't:** Include scrollTrigger config in gsap.to() calls without first registering the plugin

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
gsap.registerPlugin(ScrollTrigger); gsap.to(camera.position, { z: 2, scrollTrigger: { trigger: '.hero-section', scrub: 1 } });
```

**Bad example:**

```text
gsap.to(mesh.position, { scrollTrigger: { trigger: '.section', scrub: true } }); // TypeError: ScrollTrigger is not a constructor — not registered
```
