---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-three-timer-for-delta-time
title: "THREE.Timer for Delta Time"
summary: "Use THREE.Timer and timer.getDelta() for all time-based motion. THREE.Clock is deprecated since r183 and logs a warning. A hardcoded increment like += 0.01 runs at 2x speed on 120Hz displays and at unpredictable speed when frames drop under load. CRITICAL: call timer.update(timestamp) exactly ONCE at the top of every animate() frame before reading the timer. getDelta() and getElapsed() then return stable values for the whole frame and can be read any number of times — skipping update() leaves the delta stale and calling update() twice in one frame makes the second delta ~0."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L32"
status: active
revision: 1
---

# THREE.Timer for Delta Time

Use THREE.Timer and timer.getDelta() for all time-based motion. THREE.Clock is deprecated since r183 and logs a warning. A hardcoded increment like += 0.01 runs at 2x speed on 120Hz displays and at unpredictable speed when frames drop under load. CRITICAL: call timer.update(timestamp) exactly ONCE at the top of every animate() frame before reading the timer. getDelta() and getElapsed() then return stable values for the whole frame and can be read any number of times — skipping update() leaves the delta stale and calling update() twice in one frame makes the second delta ~0.

**Do:** Call timer.update(timestamp) once at the top of animate(); read timer.getDelta() into dt and reuse dt everywhere in that frame

**Don't:** Keep using the deprecated THREE.Clock or call timer.update() more than once per frame

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const timer = new THREE.Timer(); timer.connect(document); // optional: no huge delta after the tab was hidden function animate(timestamp) { requestAnimationFrame(animate); timer.update(timestamp); // ONCE per frame const dt = timer.getDelta(); mesh.rotation.y += dt * 0.8; particles.rotation.y += dt * 0.1; // reuse dt renderer.render(scene, camera); }
```

**Bad example:**

```text
function animate() { requestAnimationFrame(animate); mesh.rotation.y += 0.01; // 0.01 rad/frame — runs 2x faster on 120Hz than on 60Hz }
```
