---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-information-hiding
title: Hide design decisions that other modules do not need
summary: "Prevent design decisions from leaking across modules, organize around shared knowledge, and account for back-door and decorator leakage."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Organizing modules or reviewing coupling between them.
conditions_does_not_apply_when: A decision that is deliberately public contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each design decision is encapsulated in one module and does not leak through the interface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L76-L97"
status: active
revision: 1
---

# Hide design decisions that other modules do not need

Encapsulate knowledge that other modules do not need; avoid leaking a design decision across modules. Organize by shared knowledge rather than temporal sequence, account for back-door and decorator leakage, and merge modules or encapsulate shared knowledge when needed.
