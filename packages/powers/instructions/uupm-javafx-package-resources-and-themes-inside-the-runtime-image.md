---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-package-resources-and-themes-inside-the-runtime-image
title: "Package resources and themes inside the runtime image"
summary: "AtlantaFX app CSS icons and FXML must be available after jpackage"
capability_tags:
  - design-production-readiness
pattern_tags:
  - release-readiness
conditions_applies_when: "Deployment guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L73"
status: active
revision: 1
---

# Package resources and themes inside the runtime image

AtlantaFX app CSS icons and FXML must be available after jpackage

**Do:** Load resources from classpath or module resources

**Don't:** Load theme files from developer machine paths

**Applies To:** javafx 26

**Severity:** High

**Good example:**

```text
getClass().getResource("/css/app.css").toExternalForm();
```

**Bad example:**

```text
new File("src/main/resources/css/app.css").toURI()
```
