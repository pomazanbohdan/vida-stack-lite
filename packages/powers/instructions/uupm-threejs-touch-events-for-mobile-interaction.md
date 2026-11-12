---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-touch-events-for-mobile-interaction
title: "Touch Events for Mobile Interaction"
summary: "Add touchstart and touchmove listeners alongside mouse events so the scene remains interactive on mobile. Normalize touch coordinates to the same NDC range as mouse events and pass passive:false on touchmove if you call preventDefault."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Responsive guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L49"
status: active
revision: 1
---

# Touch Events for Mobile Interaction

Add touchstart and touchmove listeners alongside mouse events so the scene remains interactive on mobile. Normalize touch coordinates to the same NDC range as mouse events and pass passive:false on touchmove if you call preventDefault.

**Do:** Handle both mouse and touch input for any interactive 3D scene

**Don't:** Add only mouse event listeners and leave touch users with no interaction

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; mouse.x = (t.clientX / canvas.clientWidth) * 2 - 1; mouse.y = -(t.clientY / canvas.clientHeight) * 2 + 1; }, { passive: false }); canvas.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
```

**Bad example:**

```text
canvas.addEventListener('mousemove', handleMouse); // touch events unhandled — mobile users get no interaction
```
