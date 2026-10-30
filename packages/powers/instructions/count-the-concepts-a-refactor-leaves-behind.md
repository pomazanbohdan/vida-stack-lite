---
instruction_id: count-the-concepts-a-refactor-leaves-behind
title: Count the concepts a refactor leaves behind
summary: "Judge a refactor by the number of concepts a reader must still hold, not by how much the code moved."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is presented as a refactoring that makes the code cleaner.
conditions_does_not_apply_when: The change adds new behaviour rather than restructuring what already exists.
artifact_contract_output_type: complexity-judgement
artifact_contract_required_data:
  - the concepts before
  - the concepts after
  - the verdict on complexity
artifact_contract_verified_by: "the concept count drops, or the change is named as a relocation of complexity"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Count the concepts a refactor leaves behind

Does this refactor reduce complexity or just relocate it? Count the concepts a reader must hold to follow the change. If a "cleaner" version leaves that count unchanged, it isn't cleaner — prefer the restructuring that makes whole branches, modes, or layers disappear over one that re-centralizes the same logic. Prefer deleting an abstraction to polishing it.

"The refactor makes it cleaner" | Relocating complexity isn't reducing it. If the reader still holds the same number of concepts, the structure didn't improve — look for the version where branches disappear.
