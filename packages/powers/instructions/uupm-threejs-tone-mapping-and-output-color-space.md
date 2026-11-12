---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-tone-mapping-and-output-color-space
title: "Tone Mapping and Output Color Space"
summary: "Three.js color management is enabled by default. Keep working colors in the linear-sRGB space and set the renderer output color space to SRGBColorSpace; choose tone mapping when rendering HDR lighting to a display."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L41"
status: active
revision: 1
---

# Tone Mapping and Output Color Space

Three.js color management is enabled by default. Keep working colors in the linear-sRGB space and set the renderer output color space to SRGBColorSpace; choose tone mapping when rendering HDR lighting to a display.

**Do:** Use the default ColorManagement.enabled state and set renderer.outputColorSpace plus an appropriate toneMapping

**Don't:** Disable color management or use removed outputEncoding and sRGBEncoding properties

**Applies To:** threejs 0.185.1

**Severity:** Medium

**Good example:**

```text
THREE.ColorManagement.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
```

**Bad example:**

```text
renderer.outputEncoding = THREE.sRGBEncoding; // removed legacy properties
```
