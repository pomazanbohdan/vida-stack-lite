---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-canvas-aria-label
title: "Canvas aria-label"
summary: "Add role='img' and a descriptive aria-label to renderer.domElement after appending it to the DOM. Screen readers receive no information from a WebGL canvas — the aria-label is the only description they can announce to users."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L51"
status: active
revision: 1
---

# Canvas aria-label

Add role='img' and a descriptive aria-label to renderer.domElement after appending it to the DOM. Screen readers receive no information from a WebGL canvas — the aria-label is the only description they can announce to users.

**Do:** Set role='img' and a meaningful aria-label on renderer.domElement before or after appending it

**Don't:** Append the canvas to the DOM with no accessibility attributes — invisible to screen readers

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Interactive 3D product viewer. Drag to rotate. Scroll to zoom.'); document.body.appendChild(renderer.domElement);
```

**Bad example:**

```text
document.body.appendChild(renderer.domElement); // bare canvas — screen readers announce nothing
```
