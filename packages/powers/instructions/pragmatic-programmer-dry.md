---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-dry
title: Keep one authoritative representation of knowledge
summary: "DRY applies to knowledge and intent, not repeated text; remove conflicting copies."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: "Representing rules, logic, schemas or configuration."
conditions_does_not_apply_when: Similar-looking code that implements different rules or coincidental duplication.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule has one authoritative source and no conflicting copy remains.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L31-L53"
status: active
revision: 1
---

# Keep one authoritative representation of knowledge

Give each piece of knowledge one unambiguous authoritative representation. DRY applies to knowledge and intent, not merely repeated text; avoid duplicating rules, logic or configuration, and remove conflicting copies.
