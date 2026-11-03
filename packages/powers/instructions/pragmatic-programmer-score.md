---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-score
title: Score against the pragmatic diagnostic
summary: "Score the seven diagnostic rows, state the score and failing rows, and give fixes."
capability_tags:
  - review-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a codebase or change against the pragmatic principles.
conditions_does_not_apply_when: No score or improvement report is requested.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - improvements
artifact_contract_verified_by: "The report states the score, failing rows and concrete fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score against the pragmatic diagnostic

Score against the seven diagnostic rows, state the score and failing rows, and give fixes from the action column; use the stated bands to characterize the result.
