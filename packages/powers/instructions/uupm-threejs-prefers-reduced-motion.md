---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-prefers-reduced-motion
title: "prefers-reduced-motion"
summary: "Check window.matchMedia('(prefers-reduced-motion: reduce)') before starting any auto-rotation, particle animation, or camera movement. Users who enable this OS preference have motion sickness or vestibular disorders. IMPORTANT: reading .matches once at page load is a one-time snapshot — if the user changes their OS accessibility setting mid-session the scene will not react. Attach a 'change' listener to the MediaQueryList so noMotion stays in sync at runtime."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Accessibility guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L50"
status: active
revision: 1
---

# prefers-reduced-motion

Check window.matchMedia('(prefers-reduced-motion: reduce)') before starting any auto-rotation, particle animation, or camera movement. Users who enable this OS preference have motion sickness or vestibular disorders. IMPORTANT: reading .matches once at page load is a one-time snapshot — if the user changes their OS accessibility setting mid-session the scene will not react. Attach a 'change' listener to the MediaQueryList so noMotion stays in sync at runtime.

**Do:** Use matchMedia.addEventListener('change') to keep noMotion reactive; gate all auto-animation on the live value

**Don't:** Read .matches once at startup and never update it — the scene ignores mid-session OS setting changes

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); let noMotion = mq.matches; mq.addEventListener('change', e => { noMotion = e.matches; }); // In animate(): if (!noMotion) { mesh.rotation.y += dt * 0.8; particles.rotation.y += dt * 0.1; }
```

**Bad example:**

```text
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // one-time snapshot — mid-session OS change is ignored entirely
```
