---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-meshbasicmaterial-vs-meshstandardmaterial
title: "MeshBasicMaterial vs MeshStandardMaterial"
summary: "MeshBasicMaterial ignores all lights and is significantly cheaper — use it for UI overlays HUDs and flat-colored decorative elements. MeshStandardMaterial is PBR-accurate and requires lights. Never use StandardMaterial where BasicMaterial suffices."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L19"
status: active
revision: 1
---

# MeshBasicMaterial vs MeshStandardMaterial

MeshBasicMaterial ignores all lights and is significantly cheaper — use it for UI overlays HUDs and flat-colored decorative elements. MeshStandardMaterial is PBR-accurate and requires lights. Never use StandardMaterial where BasicMaterial suffices.

**Do:** Use MeshBasicMaterial for any object that does not need lighting; use MeshStandardMaterial for physical objects

**Don't:** Apply MeshStandardMaterial to flat UI elements that never receive light — lights still run for them

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
const uiMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // no lighting cost const physMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.4, metalness: 0.6 });
```

**Bad example:**

```text
const mat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // on a 2D HUD card — lighting calculation runs with no visual benefit
```
