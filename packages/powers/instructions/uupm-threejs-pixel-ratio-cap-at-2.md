---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-pixel-ratio-cap-at-2
title: "Pixel Ratio Cap at 2"
summary: "Cap devicePixelRatio at 2. Retina displays report 3x or higher. Going from 2x to 3x multiplies pixel count by 2.25x with no visible quality improvement at normal viewing distance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L8"
status: active
revision: 1
---

# Pixel Ratio Cap at 2

Cap devicePixelRatio at 2. Retina displays report 3x or higher. Going from 2x to 3x multiplies pixel count by 2.25x with no visible quality improvement at normal viewing distance.

**Do:** Apply Math.min(window.devicePixelRatio, 2) — cap is at 2 not at 3

**Don't:** Pass window.devicePixelRatio directly without any cap

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

**Bad example:**

```text
renderer.setPixelRatio(window.devicePixelRatio); // 3x display = 9 pixels per CSS pixel = 2.25x GPU cost for zero quality gain
```
