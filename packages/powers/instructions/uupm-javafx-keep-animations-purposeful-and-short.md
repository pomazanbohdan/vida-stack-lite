---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-keep-animations-purposeful-and-short
title: "Keep animations purposeful and short"
summary: "Desktop UI animations should clarify state changes without delaying work"
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Animation guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L37"
status: active
revision: 1
---

# Keep animations purposeful and short

Desktop UI animations should clarify state changes without delaying work

**Do:** Use 150-250ms transitions for reveal hover and selection

**Don't:** Animate every layout change with long timelines

**Applies To:** javafx 26

**Severity:** Low

**Good example:**

```text
FadeTransition ft = new FadeTransition(Duration.millis(180), pane); ft.setToValue(1);
```

**Bad example:**

```text
new Timeline(new KeyFrame(Duration.seconds(2), ...)).play();
```
