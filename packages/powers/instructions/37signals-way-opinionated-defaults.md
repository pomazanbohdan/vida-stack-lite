---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-opinionated-defaults
title: Choose defaults instead of exposing preferences
summary: "Make the product choice, revisit a default only when data shows it fails most users, avoid features that patch earlier features, and treat not now as a valid answer."
capability_tags:
  - design-user-interface
pattern_tags:
  - opinionated-defaults
conditions_applies_when: "Designing a setting, an option or a response to a feature request."
conditions_does_not_apply_when: A setting required by law or by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each preference is replaced by a default or a refusal, and any revisit condition cites evidence about most users."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L126-L150"
status: active
revision: 1
---

# Choose defaults instead of exposing preferences

Make product choices instead of burdening users with preferences; each preference reflects a decision the team could not or would not make. Choose and ship the best default, revisiting it only if data shows it fails most users; eliminate epicycles because features that patch problems created by earlier features compound complexity. Treat “not now” as a valid answer to feature requests and make no false promises. Use plain, honest interface and marketing copy, including helpful error messages, and teach what you know openly; sell useful by-products such as books, posts, and tools.
