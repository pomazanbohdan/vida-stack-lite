---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-flutter-use-animationcontroller-for-complex
title: "Use AnimationController for complex"
summary: "Fine-grained control"
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Animation guidance for flutter 3.44.x (current stable line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0; locator=stacks/flutter.csv#L33"
status: active
revision: 1
---

# Use AnimationController for complex

Fine-grained control

**Do:** AnimationController with Ticker

**Don't:** Implicit for complex sequences

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** Medium

**Good example:**

```text
AnimationController(vsync: this)
```

**Bad example:**

```text
AnimatedContainer for staggered
```
