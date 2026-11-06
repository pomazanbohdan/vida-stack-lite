---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-flutter-avoid-deep-nesting
title: "Avoid deep nesting"
summary: "Keep widget tree shallow"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for flutter 3.44.x (current stable line)."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0; locator=stacks/flutter.csv#L15"
status: active
revision: 1
---

# Avoid deep nesting

Keep widget tree shallow

**Do:** Extract deeply nested widgets

**Don't:** 10+ levels of nesting

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** Medium

**Good example:**

```text
Extract widget to method or class
```

**Bad example:**

```text
Column(Row(Column(Row(...))))
```
