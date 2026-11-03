---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-complexity-budget
title: Judge design by its effect on complexity
summary: Minimize unnecessary complexity and keep necessary complexity concentrated where it can be managed.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Evaluating a design decision that affects how hard the system is to understand or change.
conditions_does_not_apply_when: A local change with no structural effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The decision states whether it increases or decreases complexity and where the remaining complexity is concentrated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L14-L17"
status: active
revision: 1
---

# Judge design by its effect on complexity

Evaluate design decisions by whether they increase or decrease overall complexity, aiming to minimize unnecessary complexity and concentrate necessary complexity where manageable.
