---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-strategic-programming
title: Invest in design while making changes
summary: "Prefer strategic programming, treat shortcuts as future complexity, and make refactoring part of feature work."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Implementing a feature or deciding whether to take a shortcut.
conditions_does_not_apply_when: A deliberately disposable prototype.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change improves or preserves structure, and any shortcut is recorded as future complexity."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L143-L164"
status: active
revision: 1
---

# Invest in design while making changes

Prefer strategic programming: invest additional effort in design and use changes to improve structure. Treat shortcuts as future complexity, make refactoring part of feature work, and review structure as well as correctness.
