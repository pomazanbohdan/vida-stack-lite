---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-uwp-use-connectedanimations-for-continuity
title: "Use ConnectedAnimations for continuity"
summary: "Smooth transitions between pages"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for uwp legacy."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/uwp.csv; sha256=c409f08c1fbba1f1029f1acaa554e7b4471cc85517a5751c9f2e62465badcd5c; locator=stacks/uwp.csv#L21"
status: active
revision: 1
---

# Use ConnectedAnimations for continuity

Smooth transitions between pages

**Do:** ConnectedAnimationService for shared element transitions

**Don't:** Abrupt page transitions with no visual continuity

**Applies To:** uwp legacy

**Severity:** Low

**Good example:**

```text
ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("image", sourceImage);
```

**Bad example:**

```text
No transition animation between list and detail
```
