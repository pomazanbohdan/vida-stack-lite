---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-angular-use-updateon-for-performance
title: "Use updateOn for performance"
summary: "Control when validation runs to avoid per-keystroke validation overhead"
capability_tags:
  - design-user-interface
pattern_tags:
  - state-modeling
conditions_applies_when: "Forms guidance for angular 22.x."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/angular.csv; sha256=704be83f2bad30c7e6de01afb113ffa01e0c458762f48b7102f31ba2367b5553; locator=stacks/angular.csv#L25"
status: active
revision: 1
---

# Use updateOn for performance

Control when validation runs to avoid per-keystroke validation overhead

**Do:** updateOn: 'blur' or 'submit' for expensive validators

**Don't:** Default updateOn: 'change' for async validators

**Applies To:** angular 22.x

**Severity:** Low

**Good example:**

```text
fb.control('' { updateOn: 'blur' validators: [Validators.email] })
```

**Bad example:**

```text
fb.control('' [Validators.email]) // validates on every key
```
