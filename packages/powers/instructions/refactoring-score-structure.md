---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-score-structure
title: Score structural quality against the refactoring diagnostic
summary: "Score the eight diagnostic rows, lower the score for a severe smell, and report the score, smells and specific refactorings needed."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing structural quality before or after refactoring.
conditions_does_not_apply_when: A narrow behavior review that does not assess structure.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - smells
  - refactorings
artifact_contract_verified_by: "The report states the score, the smells lowering it and the refactorings needed for 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L20-L28"
status: active
revision: 1
---

# Score structural quality against the refactoring diagnostic

Score structural quality by the eight Quick Diagnostic rows using round(passed / 8 × 10), lowering the score for a severe smell. State the score, the smells lowering it, and the specific refactorings needed for 10/10; the listed score bands describe expected conditions.
