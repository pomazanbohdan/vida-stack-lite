---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-separate-user-preferences-from-application-config
title: "Separate user preferences from application config"
summary: "Enterprise apps need deploy-time config and per-user preferences"
capability_tags:
  - design-structure
pattern_tags:
  - override-layering
conditions_applies_when: "Configuration guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L72"
status: active
revision: 1
---

# Separate user preferences from application config

Enterprise apps need deploy-time config and per-user preferences

**Do:** Use config files for endpoints and Preferences for UI choices

**Don't:** Hard-code environment URLs and window state

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
Preferences.userNodeForPackage(App.class).put("theme", "dark");
```

**Bad example:**

```text
private static final String API = "http://localhost:8080";
```
