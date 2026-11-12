---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-enable-shadowmap-before-castshadow
title: "Enable shadowMap Before castShadow"
summary: "renderer.shadowMap.enabled = true must be set before any castShadow or receiveShadow flags. Without it the shadow map is never allocated and all shadow flags are silently ignored. Keep shadowMap.type at PCFShadowMap (the default): PCFSoftShadowMap is deprecated since r182 and falls back to PCFShadowMap with a console warning. For softer edges raise light.shadow.radius or use VSMShadowMap."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - performance-as-design
conditions_applies_when: "Lighting guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L23"
status: active
revision: 1
---

# Enable shadowMap Before castShadow

renderer.shadowMap.enabled = true must be set before any castShadow or receiveShadow flags. Without it the shadow map is never allocated and all shadow flags are silently ignored. Keep shadowMap.type at PCFShadowMap (the default): PCFSoftShadowMap is deprecated since r182 and falls back to PCFShadowMap with a console warning. For softer edges raise light.shadow.radius or use VSMShadowMap.

**Do:** Set renderer.shadowMap.enabled = true first then set castShadow and receiveShadow on lights and meshes

**Don't:** Set castShadow on a light or mesh without enabling renderer.shadowMap.enabled — shadows never render

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // default dirLight.castShadow = true; dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048; dirLight.shadow.radius = 2; // optional: softer PCF edges heroMesh.castShadow = true; ground.receiveShadow = true;
```

**Bad example:**

```text
dirLight.castShadow = true; heroMesh.castShadow = true; // renderer.shadowMap.enabled never set — shadows silently do not render
```
