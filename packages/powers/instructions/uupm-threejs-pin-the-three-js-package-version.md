---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-pin-the-three-js-package-version
title: "Pin the Three.js Package Version"
summary: "Install the exact current Three.js release with npm for bundler projects. If a browser CDN is unavoidable use an import map pinned to the same exact release instead of a floating URL."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L2"
status: active
revision: 1
---

# Pin the Three.js Package Version

Install the exact current Three.js release with npm for bundler projects. If a browser CDN is unavoidable use an import map pinned to the same exact release instead of a floating URL.

**Do:** Pin three@0.185.1 and keep core and addon imports on that release

**Don't:** Use a floating latest URL or a legacy global build as the default production setup

**Applies To:** threejs 0.185.1

**Severity:** Critical

**Good example:**

```text
npm install three@0.185.1
```

**Bad example:**

```text
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```
