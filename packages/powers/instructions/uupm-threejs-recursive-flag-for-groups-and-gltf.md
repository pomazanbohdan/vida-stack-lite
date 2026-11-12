---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-recursive-flag-for-groups-and-gltf
title: "Recursive Flag for Groups and GLTF"
summary: "Pass true as the second argument to intersectObjects when testing Groups or GLTF loaded models. Geometry lives on child Mesh objects — without recursive:true the parent group is tested but has no geometry and hits is always empty."
capability_tags:
  - design-user-interface
pattern_tags:
  - predictable-rules
conditions_applies_when: "Raycasting guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L29"
status: active
revision: 1
---

# Recursive Flag for Groups and GLTF

Pass true as the second argument to intersectObjects when testing Groups or GLTF loaded models. Geometry lives on child Mesh objects — without recursive:true the parent group is tested but has no geometry and hits is always empty.

**Do:** Use intersectObjects(targets true) for Groups or any loaded model

**Don't:** Raycast against a parent Group without the recursive flag

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const hits = raycaster.intersectObjects(scene.children, true); // catches all descendant meshes
```

**Bad example:**

```text
const hits = raycaster.intersectObjects([modelGroup]); // recursive defaults to false — misses all children
```
