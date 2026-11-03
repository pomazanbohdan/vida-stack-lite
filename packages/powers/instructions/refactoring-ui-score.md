---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-score
title: Score the interface against the eight rows
summary: Score satisfied diagnostic rows out of eight and report the score and rows to fix.
capability_tags:
  - design-user-interface
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a visual interface.
conditions_does_not_apply_when: A narrow functional review that does not assess visuals.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
artifact_contract_verified_by: The report states the score and the diagnostic rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the interface against the eight rows

Score = round(satisfied diagnostic rows / 8 * 10). Bands: 10 means all eight pass; 9 means one gap; 6-8 means two or three gaps; <=5 means four or more gaps. Always state current score and diagnostic rows to fix for 10/10.
