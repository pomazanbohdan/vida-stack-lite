---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-organize-data
title: Replace primitives and exposed data with named values
summary: "Encapsulate mutable data, use subclasses or Strategy for behavior-affecting type codes, and convert value to reference only when shared identity is required."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "Raw primitives, exposed mutable data or type codes carry domain meaning."
conditions_does_not_apply_when: A value whose primitive form is fixed by an external format.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The named value or encapsulated behavior expresses the domain rule and preserves behavior.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L104-L127"
status: active
revision: 1
---

# Replace primitives and exposed data with named values

Replace raw primitives or exposed mutable data with named values and encapsulated behavior. Use subclasses for behavior-affecting type codes, Strategy when subclassing is impractical, and value-to-reference conversion when shared identity is required.
