---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-javafx-use-jlink-or-jpackage-for-desktop-delivery
title: "Use jlink or jpackage for desktop delivery"
summary: "JavaFX apps should ship with the runtime they need"
capability_tags:
  - design-production-readiness
pattern_tags:
  - release-readiness
conditions_applies_when: "Packaging guidance for javafx 26."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869; locator=stacks/javafx.csv#L45"
status: active
revision: 1
---

# Use jlink or jpackage for desktop delivery

JavaFX apps should ship with the runtime they need

**Do:** Package a runtime image or native installer

**Don't:** Ask end users to install matching Java and JavaFX manually

**Applies To:** javafx 26

**Severity:** Medium

**Good example:**

```text
jpackage --name MyApp --module app/app.Main --runtime-image build/image
```

**Bad example:**

```text
java -jar app.jar
```
