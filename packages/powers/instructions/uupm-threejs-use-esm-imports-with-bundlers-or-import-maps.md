---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-use-esm-imports-with-bundlers-or-import-maps
title: "Use ESM Imports with Bundlers or Import Maps"
summary: "Import Three.js from three in bundler projects. For a no-build browser page define an exact-version import map for three and three/addons/ before importing modules."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L6"
status: active
revision: 1
---

# Use ESM Imports with Bundlers or Import Maps

Import Three.js from three in bundler projects. For a no-build browser page define an exact-version import map for three and three/addons/ before importing modules.

**Do:** Use one ESM dependency graph with core and addons pinned to the same release

**Don't:** Mix global script builds with ES module imports or map core and addons to different versions

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/"}}</script> <script type="module">import * as THREE from 'three'; import { OrbitControls } from 'three/addons/controls/OrbitControls.js';</script>
```

**Bad example:**

```text
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script type="module">import * as THREE from 'three';</script>
```
