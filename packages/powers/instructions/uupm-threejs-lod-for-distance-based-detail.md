---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-lod-for-distance-based-detail
title: "LOD for Distance-Based Detail"
summary: "Use THREE.LOD to automatically swap high-detail and low-detail geometry as objects move closer or farther from the camera. This maintains frame rate in scenes with many objects spread across a large depth range."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Production guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L54"
status: active
revision: 1
---

# LOD for Distance-Based Detail

Use THREE.LOD to automatically swap high-detail and low-detail geometry as objects move closer or farther from the camera. This maintains frame rate in scenes with many objects spread across a large depth range.

**Do:** Use THREE.LOD to reduce triangle count on distant objects automatically

**Don't:** Render the same high-polygon geometry for every object regardless of its distance from the camera

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const lod = new THREE.LOD(); lod.addLevel(highDetailMesh, 0); // used when < 15 units away lod.addLevel(medDetailMesh, 15); // 15–50 units lod.addLevel(lowDetailMesh, 50); // 50+ units scene.add(lod);
```

**Bad example:**

```text
scene.add(highDetailMesh); // 64k-triangle mesh rendered at full cost whether 1 unit or 100 units from camera
```
