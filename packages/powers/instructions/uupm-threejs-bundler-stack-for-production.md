---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-bundler-stack-for-production
title: "Bundler Stack for Production"
summary: "For production install the exact Three.js release from npm and use a bundler such as Vite. Import optional loaders controls and post-processing modules from three/addons so all modules share one version."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L52"
status: active
revision: 1
---

# Bundler Stack for Production

For production install the exact Three.js release from npm and use a bundler such as Vite. Import optional loaders controls and post-processing modules from three/addons so all modules share one version.

**Do:** Use npm install three@0.185.1 and import core plus addons through ESM

**Don't:** Serve legacy global scripts or import addons from deprecated examples/js paths

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
npm install three@0.185.1; import * as THREE from 'three'; import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

**Bad example:**

```text
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> // legacy global build with no module graph
```
