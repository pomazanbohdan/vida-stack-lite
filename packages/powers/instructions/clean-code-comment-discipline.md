---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-comment-discipline
title: "Use comments for why, not what"
summary: "Keep useful rationale, legal notices, TODOs and API documentation; delete stale comments and format for scanability."
capability_tags:
  - simplify-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Writing, reviewing or removing comments and formatting code."
conditions_does_not_apply_when: Generated or vendored code that must not be edited.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Comments explain intent or constraints rather than restating code.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L83-L106"
status: active
revision: 1
---

# Use comments for why, not what

Use comments to explain why, not what; prefer clear names and extracted functions. Keep only useful comments such as legal notices, TODOs, public API documentation and genuine rationale; remove commented-out code and journal comments. Format for scanability, group related concepts, and keep declarations near use.
