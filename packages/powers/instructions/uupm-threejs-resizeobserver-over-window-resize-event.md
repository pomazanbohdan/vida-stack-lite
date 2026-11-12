---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-resizeobserver-over-window-resize-event
title: "ResizeObserver Over window resize Event"
summary: "Use ResizeObserver on the canvas container instead of the window resize event. ResizeObserver fires when the container element changes size independently of the browser window — common in split-pane layouts and sidebar collapsing."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L48"
status: active
revision: 1
---

# ResizeObserver Over window resize Event

Use ResizeObserver on the canvas container instead of the window resize event. ResizeObserver fires when the container element changes size independently of the browser window — common in split-pane layouts and sidebar collapsing.

**Do:** Attach ResizeObserver to the canvas parent element for accurate container-aware resize detection

**Don't:** Use only window.addEventListener('resize') for canvas sizing when the canvas is not fullscreen

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const ro = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }); ro.observe(canvas.parentElement);
```

**Bad example:**

```text
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); }); // misses container-only resize events in split-pane UIs
```
