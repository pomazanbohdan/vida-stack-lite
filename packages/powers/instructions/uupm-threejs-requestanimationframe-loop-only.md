---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-requestanimationframe-loop-only
title: "requestAnimationFrame Loop Only"
summary: "Drive the render loop exclusively with requestAnimationFrame or renderer.setAnimationLoop(). Never use setInterval or setTimeout — they are not synchronized to the display refresh rate and keep running when the tab is hidden draining battery."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L31"
status: active
revision: 1
---

# requestAnimationFrame Loop Only

Drive the render loop exclusively with requestAnimationFrame or renderer.setAnimationLoop(). Never use setInterval or setTimeout — they are not synchronized to the display refresh rate and keep running when the tab is hidden draining battery.

**Do:** Use requestAnimationFrame or renderer.setAnimationLoop() as the sole render loop driver

**Don't:** Use setInterval or setTimeout for render timing

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); } animate();
```

**Bad example:**

```text
setInterval(() => renderer.render(scene, camera), 16); // not display-synced; runs at full speed even when tab is hidden
```
