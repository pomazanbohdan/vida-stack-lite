---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-threejs-particle-count-ceiling
title: "Particle Count Ceiling"
summary: "Start particle systems at 1000–3000 particles. Beyond 50000 causes sustained frame drops on mid-range mobile. Always test on a real device before increasing the count — desktop and mobile GPU performance ratios can be 10:1."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-as-design
conditions_applies_when: "Particles guidance for threejs 0.185.1."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/threejs.csv; sha256=155d583b9c64da0df4b6c6cb060c02eab222505e0734d6353da02c9e2b5d982b; locator=stacks/threejs.csv#L45"
status: active
revision: 1
---

# Particle Count Ceiling

Start particle systems at 1000–3000 particles. Beyond 50000 causes sustained frame drops on mid-range mobile. Always test on a real device before increasing the count — desktop and mobile GPU performance ratios can be 10:1.

**Do:** Start at 3000 particles and profile on actual mobile hardware before raising the limit

**Don't:** Set particle count at 100000 or higher without any mobile profiling

**Applies To:** threejs 0.185.1

**Severity:** High

**Good example:**

```text
const COUNT = 3000; // safe mobile baseline — profile before going higher const pos = new Float32Array(COUNT * 3);
```

**Bad example:**

```text
const COUNT = 150000; // 60fps on desktop — 8fps on a mid-range Android phone
```
