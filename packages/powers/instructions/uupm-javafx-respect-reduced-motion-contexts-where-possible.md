---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-respect-reduced-motion-contexts-where-possible
title: "Respect reduced-motion contexts where possible"
summary: "Some users experience motion sensitivity in desktop apps"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L38"
status: active
revision: 1
---

# Respect reduced-motion contexts where possible

Some users experience motion sensitivity in desktop apps

**Do:** Provide a setting to disable decorative animations

**Don't:** Make animation required for comprehension

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
if (settings.reducedMotion()) pane.setOpacity(1); else fade.play();
```

**Bad example:**

```text
alwaysSpin.play();
```
