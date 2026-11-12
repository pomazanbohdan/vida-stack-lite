---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-import-orbitcontrols-from-three-js-addons
title: "Import OrbitControls from Three.js Addons"
summary: "OrbitControls is an addon and must be imported explicitly from the three/addons path while the core library is imported from three."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L4"
status: active
revision: 1
---

# Import OrbitControls from Three.js Addons

OrbitControls is an addon and must be imported explicitly from the three/addons path while the core library is imported from three.

**Do:** Import the named OrbitControls addon before constructing controls

**Don't:** Expect THREE.OrbitControls to exist on the core namespace

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
import * as THREE from 'three'; import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; const controls = new OrbitControls(camera, renderer.domElement);
```

**Bad example:**

```text
const controls = new THREE.OrbitControls(camera, renderer.domElement); // not exported by the core namespace
```
