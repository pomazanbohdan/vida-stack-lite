---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-scrub-for-scroll-driven-camera-path
title: "scrub for Scroll-Driven Camera Path"
summary: "Use scrub:true or scrub:1 to link camera movement continuously to scroll position as a 0–1 ratio. scrub:1 adds a 1-second lag for cinematic smoothness. onEnter/onLeave fire only once and create jarring snaps — not the right tool for a camera path."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L39"
status: active
revision: 1
---

# scrub for Scroll-Driven Camera Path

Use scrub:true or scrub:1 to link camera movement continuously to scroll position as a 0–1 ratio. scrub:1 adds a 1-second lag for cinematic smoothness. onEnter/onLeave fire only once and create jarring snaps — not the right tool for a camera path.

**Do:** Use scrub:1 for any scroll-controlled camera movement

**Don't:** Use onEnter or onLeave callbacks for camera motion — they snap instead of scrubbing

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
gsap.registerPlugin(ScrollTrigger); gsap.to(camera.position, { x: 5, y: 2, z: 0, ease: 'none', scrollTrigger: { trigger: '.canvas-wrapper', start: 'top top', end: 'bottom bottom', scrub: 1 } });
```

**Bad example:**

```text
gsap.to(camera.position, { z: 0, scrollTrigger: { trigger: '.section', onEnter: () => {} } }); // fires once at scroll threshold — not a continuous scrub
```
