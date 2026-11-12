---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-gsap-for-multi-step-sequences
title: "GSAP for Multi-Step Sequences"
summary: "Use GSAP timelines for any animation with more than two sequential steps or for scroll-linked camera paths. GSAP timelines can be paused reversed and scrubbed — far more maintainable than boolean state machines."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L34"
status: active
revision: 1
---

# GSAP for Multi-Step Sequences

Use GSAP timelines for any animation with more than two sequential steps or for scroll-linked camera paths. GSAP timelines can be paused reversed and scrubbed — far more maintainable than boolean state machines.

**Do:** Use GSAP timelines for sequences with more than two steps and for scroll-driven animations

**Don't:** Implement multi-step sequences with boolean flags and manual frame counters

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const tl = gsap.timeline({ defaults: { ease: 'power2.out' } }); tl.from(mesh.position, { y: -3, duration: 1 }) .to(mesh.rotation, { y: Math.PI, duration: 1 }, '-=0.3') .to(camera.position, { z: 2, duration: 1.5 });
```

**Bad example:**

```text
let step = 0; let t = 0; function animate() { if (step === 0 && (t += 0.01) >= 1) step = 1; } // grows unmanageable with 3+ steps
```
