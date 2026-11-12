---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-buffergeometry-for-custom-vertex-data
title: "BufferGeometry for Custom Vertex Data"
summary: "For custom shapes use BufferGeometry with typed BufferAttribute data for positions normals colors and other vertex attributes."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Geometry guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L18"
status: active
revision: 1
---

# BufferGeometry for Custom Vertex Data

For custom shapes use BufferGeometry with typed BufferAttribute data for positions normals colors and other vertex attributes.

**Do:** Use THREE.BufferGeometry with Float32Array-backed attributes for custom vertex data

**Don't:** Reference or instantiate the removed THREE.Geometry class

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
```

**Bad example:**

```text
const geo = new THREE.Geometry(); geo.vertices.push(new THREE.Vector3(0, 0, 0)); // removed legacy API
```
