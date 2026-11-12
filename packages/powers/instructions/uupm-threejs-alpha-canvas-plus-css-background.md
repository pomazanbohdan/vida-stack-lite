---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-alpha-canvas-plus-css-background
title: "Alpha Canvas Plus CSS Background"
summary: "Set alpha:true on the renderer and control the background color through CSS rather than a renderer clear color. This composites the canvas correctly over any HTML content behind it."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Setup guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L9"
status: active
revision: 1
---

# Alpha Canvas Plus CSS Background

Set alpha:true on the renderer and control the background color through CSS rather than a renderer clear color. This composites the canvas correctly over any HTML content behind it.

**Do:** Set alpha:true on renderer and let body or a parent div provide the background color

**Don't:** Set a solid renderer clear color when the canvas must composite over HTML behind it

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const renderer = new THREE.WebGLRenderer({ alpha: true }); renderer.setClearColor(0x000000, 0); // fully transparent canvas // body { background: #0d0d0d; } handles the visible color
```

**Bad example:**

```text
renderer.setClearColor(0x111827); // fully opaque — HTML behind the canvas is blocked
```
