---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-canvas-dimensions-not-window
title: "Canvas Dimensions Not Window"
summary: "Size the renderer and camera to the canvas element's clientWidth and clientHeight — not window.innerWidth and innerHeight. This is correct when the canvas is inside a flex or grid container that does not fill the full viewport."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L47"
status: active
revision: 1
---

# Canvas Dimensions Not Window

Size the renderer and camera to the canvas element's clientWidth and clientHeight — not window.innerWidth and innerHeight. This is correct when the canvas is inside a flex or grid container that does not fill the full viewport.

**Do:** Use canvas.clientWidth and canvas.clientHeight for all renderer and camera sizing

**Don't:** Hardcode renderer size to window.innerWidth/innerHeight when the canvas may be inside a container

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
renderer.setSize(canvas.clientWidth, canvas.clientHeight); camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix();
```

**Bad example:**

```text
renderer.setSize(window.innerWidth, window.innerHeight); // wrong when canvas lives inside a sidebar or grid column
```
