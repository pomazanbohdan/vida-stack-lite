---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-reversibility
title: Prefer reversible decisions
summary: Isolate volatile choices behind interfaces or configuration and avoid premature commitments.
capability_tags:
  - design-structure
pattern_tags:
  - revertable-increments
conditions_applies_when: "Choosing vendors, databases, architectures or other costly-to-change options."
conditions_does_not_apply_when: A decision fixed by contract or an external constraint.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The choice can be reversed at a cost proportional to its scope.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L147-L169"
status: active
revision: 1
---

# Prefer reversible decisions

Prefer decisions that can be reversed when uncertainty remains; isolate volatile choices behind interfaces or configuration and avoid premature commitments that make change costly.
