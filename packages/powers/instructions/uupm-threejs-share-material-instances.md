---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-share-material-instances
title: "Share Material Instances"
summary: "Share one material instance across all meshes that have identical properties. Call mat.clone() only when individual meshes genuinely need different property values. Duplicate materials waste GPU VRAM."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Materials guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L20"
status: active
revision: 1
---

# Share Material Instances

Share one material instance across all meshes that have identical properties. Call mat.clone() only when individual meshes genuinely need different property values. Duplicate materials waste GPU VRAM.

**Do:** Assign the same material reference to all meshes with identical visual properties

**Don't:** Create a new material inside a loop for objects that look identical

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const mat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.5 }); meshA.material = mat; meshB.material = mat; meshC.material = mat; // one GPU material
```

**Bad example:**

```text
for (const m of meshes) { m.material = new THREE.MeshStandardMaterial({ color: 0x4f46e5 }); } // N redundant GPU materials
```
