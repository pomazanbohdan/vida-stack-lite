---
instruction_id: reference-platform-conventions-instead-of-restating-values
title: Reference platform conventions instead of restating values
summary: "When a value belongs to a native platform, record a note that names the platform own role instead of a literal value; the platform owns the rendered value."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: The design inherits a value from a native platform.
conditions_does_not_apply_when: The value is the product own.
artifact_contract_output_type: platform-note
artifact_contract_required_data:
  - the platform role
  - the note field
artifact_contract_verified_by: no platform value is written as a literal in the product own tokens
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Reference platform conventions instead of restating values
When inheriting from native platforms (iOS UIKit, Android Compose, Apple Human Interface Guidelines), use a `note` field instead of literal values: `{ note: 'iOS Title 1 · Android Headline Small' }`. The spec is the spec; the platform owns the rendered values.
