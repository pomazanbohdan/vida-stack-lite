---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-fov-range-45-to-75
title: "FOV Range 45 to 75"
summary: "Use a field of view between 45 and 75 degrees. Below 45 creates compressed telephoto distortion. Above 90 creates visible fisheye distortion at frame edges."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - craft-detail
conditions_applies_when: "Camera guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L11"
status: active
revision: 1
---

# FOV Range 45 to 75

Use a field of view between 45 and 75 degrees. Below 45 creates compressed telephoto distortion. Above 90 creates visible fisheye distortion at frame edges.

**Do:** Start at 75 for general interactive scenes; use 45–55 for product close-ups

**Don't:** Use FOV above 90 or below 30 without a deliberate artistic reason

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000); // general const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000); // product shot
```

**Bad example:**

```text
const camera = new THREE.PerspectiveCamera(120, aspect, 0.1, 1000); // fisheye distortion at all edges
```
