---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-single-renderer-per-page
title: "Single Renderer Per Page"
summary: "Create one WebGLRenderer instance for the lifetime of the page. Multiple renderers compete for the browser GPU context limit (8–16 contexts) and cause context-lost errors especially on mobile."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L7"
status: active
revision: 1
---

# Single Renderer Per Page

Create one WebGLRenderer instance for the lifetime of the page. Multiple renderers compete for the browser GPU context limit (8–16 contexts) and cause context-lost errors especially on mobile.

**Do:** Reuse a single renderer and swap scene content instead of recreating the renderer

**Don't:** Create a new renderer on each component mount or scene transition

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(canvas.clientWidth, canvas.clientHeight); // renderer lives for the page lifetime
```

**Bad example:**

```text
function showScene() { const renderer = new THREE.WebGLRenderer(); document.body.appendChild(renderer.domElement); } showScene(); showScene(); // two GPU contexts — crashes on mobile
```
