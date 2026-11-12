---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-pause-render-loop-on-tab-hidden
title: "Pause Render Loop on Tab Hidden"
summary: "Use renderer.setAnimationLoop() as the loop driver so you can pass null to pause and a function to resume. Continuous rendering in a hidden tab wastes CPU GPU and battery with no user benefit."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L35"
status: active
revision: 1
---

# Pause Render Loop on Tab Hidden

Use renderer.setAnimationLoop() as the loop driver so you can pass null to pause and a function to resume. Continuous rendering in a hidden tab wastes CPU GPU and battery with no user benefit.

**Do:** Use renderer.setAnimationLoop(animate) to drive the loop; pass null to pause on visibilitychange

**Don't:** Drive with internal requestAnimationFrame and never stop the loop when the tab is hidden

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const timer = new THREE.Timer(); timer.connect(document); // resets on tab return so the first delta after resume is not huge renderer.setAnimationLoop(animate); // use setAnimationLoop as the driver — not requestAnimationFrame inside animate function animate(timestamp) { timer.update(timestamp); const dt = timer.getDelta(); renderer.render(scene, camera); } document.addEventListener('visibilitychange', () => { if (document.hidden) renderer.setAnimationLoop(null); else renderer.setAnimationLoop(animate); });
```

**Bad example:**

```text
function animate() { requestAnimationFrame(animate); // self-referencing RAF cannot be stopped externally renderer.render(scene, camera); } animate(); // runs forever in background tab — drains battery
```
