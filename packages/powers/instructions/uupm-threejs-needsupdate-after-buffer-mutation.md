---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-needsupdate-after-buffer-mutation
title: "needsUpdate After Buffer Mutation"
summary: "After mutating any BufferAttribute array values per frame you must set geometry.attributes.position.needsUpdate = true so Three.js re-uploads the changed buffer to the GPU. Without it the GPU still uses the old data and particles appear completely frozen."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Particles guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L46"
status: active
revision: 1
---

# needsUpdate After Buffer Mutation

After mutating any BufferAttribute array values per frame you must set geometry.attributes.position.needsUpdate = true so Three.js re-uploads the changed buffer to the GPU. Without it the GPU still uses the old data and particles appear completely frozen.

**Do:** Set needsUpdate = true on the position attribute after every per-frame mutation of the array

**Don't:** Mutate the Float32Array values without flagging needsUpdate — positions update in JS but not on the GPU

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
// In animate() after timer.update(timestamp): const t = timer.getElapsed(); const pos = geo.attributes.position.array; for (let i = 0; i < pos.length; i += 3) { pos[i + 1] += Math.sin(t + i) * 0.001; // Y component } geo.attributes.position.needsUpdate = true; // GPU re-upload
```

**Bad example:**

```text
// In animate(): pos[1] += 0.001; // JS array updated — GPU buffer is stale — particles do not move
```
