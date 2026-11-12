---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-prefer-primer-for-enterprise-applications
title: "Prefer Primer for enterprise applications"
summary: "PrimerLight and PrimerDark are neutral enough for dense business workflows"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Theme guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L48"
status: active
revision: 1
---

# Prefer Primer for enterprise applications

PrimerLight and PrimerDark are neutral enough for dense business workflows

**Do:** Use PrimerLight as default and PrimerDark for dark mode

**Don't:** Use Dracula or Cupertino as the default enterprise theme

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
Application.setUserAgentStylesheet(new PrimerLight().getUserAgentStylesheet());
```

**Bad example:**

```text
Application.setUserAgentStylesheet(new Dracula().getUserAgentStylesheet());
```
