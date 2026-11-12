---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-antialias-set-at-construction-only
title: "antialias Set at Construction Only"
summary: "The antialias option can only be set at WebGLRenderer construction time. Setting renderer.antialias after construction has absolutely no effect — the WebGL context is already created without it. Decide before instantiating."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L42"
status: active
revision: 1
---

# antialias Set at Construction Only

The antialias option can only be set at WebGLRenderer construction time. Setting renderer.antialias after construction has absolutely no effect — the WebGL context is already created without it. Decide before instantiating.

**Do:** Set antialias:true inside the WebGLRenderer constructor options object

**Don't:** Construct the renderer without antialias then try to enable it by assigning the property

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // antialias baked into the WebGL context
```

**Bad example:**

```text
const renderer = new THREE.WebGLRenderer(); renderer.antialias = true; // no effect — context created without AA — edges remain aliased
```
