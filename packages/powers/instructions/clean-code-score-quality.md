---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-score-quality
title: Score code quality against the clean-code principles
summary: Give a 0-10 score and report the specific improvements needed to reach 10.
capability_tags:
  - review-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a codebase or change against the clean-code principles.
conditions_does_not_apply_when: No score or improvement report is requested.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - improvements
artifact_contract_verified_by: The report states the score and concrete improvements.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score code quality against the clean-code principles

When assessing code against the stated principles, give a 0–10 score and report the current score and specific improvements needed to reach 10.
