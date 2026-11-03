---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-orthogonality
title: Keep components orthogonal
summary: "Separate concerns, avoid global state and minimize coupling while preserving cohesive responsibilities."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Designing or reviewing modules, components or services."
conditions_does_not_apply_when: Coupling fixed by an external framework that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A change in one component does not force unrelated changes elsewhere.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L54-L76"
status: active
revision: 1
---

# Keep components orthogonal

Keep components independent so a change in one does not cause unrelated changes elsewhere. Separate concerns, avoid global state and minimize coupling while preserving cohesive responsibilities.
