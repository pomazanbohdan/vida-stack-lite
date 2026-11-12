---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-load-gsap-before-scene-script
title: "Load GSAP Before Scene Script"
summary: "Load GSAP from its own CDN script tag before your scene script. In bundler projects install via npm and import. GSAP is a completely separate library from Three.js — never try to import it from the Three.js package."
capability_tags:
  - design-microinteraction
pattern_tags:
  - choreographed-motion
conditions_applies_when: "GSAP guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L36"
status: active
revision: 1
---

# Load GSAP Before Scene Script

Load GSAP from its own CDN script tag before your scene script. In bundler projects install via npm and import. GSAP is a completely separate library from Three.js — never try to import it from the Three.js package.

**Do:** Load GSAP CDN before the scene script; or npm install gsap and import separately

**Don't:** Import gsap from three or expect it to be defined without a separate load

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
<!-- CDN: load GSAP before your scene script --> <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script> <!-- Bundler: --> // import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger';
```

**Bad example:**

```text
import gsap from 'three'; // undefined — GSAP has nothing to do with Three.js
```
