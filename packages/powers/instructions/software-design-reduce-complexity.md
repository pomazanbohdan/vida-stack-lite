---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-reduce-complexity
title: Reduce complexity from dependencies and obscurity
summary: "Look for change amplification, cognitive load and unknown unknowns; centralize knowledge and make dependencies and names explicit."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Diagnosing a system that is hard to understand or modify.
conditions_does_not_apply_when: Complexity that is inherent to the problem and cannot be removed.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design reduces change amplification, cognitive load or unknown unknowns rather than relocating them."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L33-L53"
status: active
revision: 1
---

# Reduce complexity from dependencies and obscurity

Treat complexity as structure that makes systems hard to understand or modify; look for change amplification, cognitive load and unknown unknowns, caused by dependencies or obscurity. Reduce these through centralized knowledge, lower cognitive burden, explicit dependencies and precise names.
