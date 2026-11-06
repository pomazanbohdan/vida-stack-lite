---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-transitions-for-implicit-animations
title: "Use Transitions for implicit animations"
summary: "Automatic animation when property values change"
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Animation guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L48"
status: active
revision: 1
---

# Use Transitions for implicit animations

Automatic animation when property values change

**Do:** Transitions collection on controls for smooth changes

**Don't:** Instant property changes with no visual feedback

**Applies To:** avalonia 12

**Severity:** Low

**Good example:**

```text
<Button.Transitions><TransformOperationsTransition Property="RenderTransform" Duration="0:0:0.2"/></Button.Transitions>
```

**Bad example:**

```text
Direct property set with no transition
```
