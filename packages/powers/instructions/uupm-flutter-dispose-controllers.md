---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-flutter-dispose-controllers
title: "Dispose controllers"
summary: "Clean up text controllers"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for flutter 3.44.x (current stable line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0; locator=stacks/flutter.csv#L39"
status: active
revision: 1
---

# Dispose controllers

Clean up text controllers

**Do:** dispose() for controllers

**Don't:** Memory leaks

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** High

**Good example:**

```text
controller.dispose() in dispose
```

**Bad example:**

```text
No controller disposal
```
